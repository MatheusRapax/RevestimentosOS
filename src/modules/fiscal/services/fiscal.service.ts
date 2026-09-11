import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { UpdateFiscalSettingsDto } from '../dto/update-fiscal-settings.dto';
import { UpsertFiscalProfileDto } from '../dto/upsert-fiscal-profile.dto';
import FormData from 'form-data';

@Injectable()
export class FiscalService {
  private readonly logger = new Logger(FiscalService.name);

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  /**
   * Resolve a URL base do NexosFiscal e a API Key do tenant desta clínica
   * (mesma lógica de fallback usada em emitirNota: config no banco → env).
   */
  private async resolveFiscalCreds(
    clinicId: string,
  ): Promise<{ apiUrl: string; apiKey: string }> {
    const config = await this.prisma.clinicFiscalConfig.findUnique({
      where: { clinicId },
    });
    const apiKey =
      config?.nexosApiKey || this.configService.get<string>('FISCAL_API_KEY');
    const apiUrl = this.configService.get<string>('FISCAL_MICROSERVICE_URL');
    if (!apiKey || !apiUrl) {
      throw new BadRequestException(
        'Configuração fiscal (API Key / URL do serviço) ausente.',
      );
    }
    return { apiUrl, apiKey };
  }

  async setupNexosFiscal(
    clinicId: string,
    name: string,
    document: string,
    pfxBuffer: Buffer,
    password: string,
    originalFileName: string,
    fiscal?: { ie?: string; uf?: string; cityCode?: string; crt?: string },
  ) {
    const masterApiKey = this.configService.get<string>(
      'FISCAL_MASTER_API_KEY',
    );
    const apiUrl = this.configService.get<string>('FISCAL_MICROSERVICE_URL');

    if (!masterApiKey || !apiUrl) {
      throw new Error(
        'FISCAL_MASTER_API_KEY ou FISCAL_MICROSERVICE_URL não configurados no .env',
      );
    }

    // Ambiente vem do default fiscal da clínica ("1"=produção, "2"=homologação)
    const [existing, profile] = await Promise.all([
      this.prisma.clinicFiscalConfig.findUnique({ where: { clinicId } }),
      this.prisma.fiscalProfile.findUnique({ where: { clinicId } }),
    ]);
    const environment =
      existing?.environment === '1' ? 'producao' : 'homologacao';

    // A API do NexosFiscal exige a identidade fiscal do emitente na criação do
    // tenant. Os campos do formulário de setup são overrides; o padrão é o
    // Perfil do Emitente (FiscalProfile).
    const cnpj = (document || profile?.cnpj || '').replace(/\D/g, '');
    const cityCode = (fiscal?.cityCode || profile?.municipioIbge || '').replace(
      /\D/g,
      '',
    );
    const tenantPayload = {
      name,
      cnpj,
      ie: (fiscal?.ie || profile?.ie)?.trim() || undefined,
      uf: (fiscal?.uf || profile?.uf || '').trim().toUpperCase(),
      cityCode,
      crt: Number(fiscal?.crt) || profile?.crt || 3, // 1=Simples, 2=Simples excesso, 3=Regime normal
      environment,
    };

    if (cnpj.length !== 14 || tenantPayload.uf.length !== 2 || cityCode.length !== 7) {
      throw new BadRequestException(
        'Dados fiscais do emitente incompletos: informe CNPJ (14 díg.), UF (2 letras) e o código IBGE do município (7 díg.).',
      );
    }

    try {
      this.logger.log(`Starting NexosFiscal setup for clinic ${clinicId}`);

      // 1. Create Tenant
      const createTenantRes = await firstValueFrom(
        this.httpService.post(`${apiUrl}/tenants`, tenantPayload, {
          headers: { 'X-API-Key': masterApiKey },
        }),
      );
      const tenantId = createTenantRes.data.id;

      this.logger.log(`Tenant created: ${tenantId}`);

      // 2. Generate API Key
      const createKeyRes = await firstValueFrom(
        this.httpService.post(
          `${apiUrl}/tenants/${tenantId}/api-keys`,
          { name: `${name} - ERP` },
          {
            headers: { 'X-API-Key': masterApiKey },
          },
        ),
      );
      // O NexosFiscal retorna o campo `apiKey` (não `key`).
      const apiKey = createKeyRes.data.apiKey || createKeyRes.data.key;
      if (!apiKey) {
        throw new Error(
          'O serviço fiscal não retornou a API Key na criação da chave.',
        );
      }

      this.logger.log(`API Key generated for tenant: ${tenantId}`);

      // 3. Upload Certificate
      const form = new FormData();
      form.append('file', pfxBuffer, { filename: originalFileName });
      form.append('password', password);
      form.append('name', `${name} - A1`);

      await firstValueFrom(
        this.httpService.post(`${apiUrl}/certificate`, form, {
          headers: {
            ...form.getHeaders(),
            'X-API-Key': apiKey, // Use the newly generated key
          },
        }),
      );

      this.logger.log(`Certificate uploaded for tenant: ${tenantId}`);

      // 4. Save to Database
      await this.prisma.clinicFiscalConfig.upsert({
        where: { clinicId },
        create: {
          clinicId,
          nexosTenantId: tenantId,
          nexosApiKey: apiKey,
          environment: '2', // default homologation
        },
        update: {
          nexosTenantId: tenantId,
          nexosApiKey: apiKey,
        },
      });

      return {
        success: true,
        message: 'Configuração fiscal concluída com sucesso',
      };
    } catch (error: any) {
      this.logger.error(
        `Error in setupNexosFiscal: ${error.response?.data?.message || error.message}`,
      );
      throw new BadRequestException(
        'Erro ao configurar serviço fiscal: ' +
          (error.response?.data?.message || error.message),
      );
    }
  }

  // ── Contexto + payload compartilhados por validate e emit ──────────────

  private async buildEmitContext(orderId: string, clinicId: string) {
    let config = await this.prisma.clinicFiscalConfig.findUnique({
      where: { clinicId },
    });
    if (!config) {
      config = {
        clinicId,
        id: 'transient',
        nexosApiKey: null,
        environment: '2',
        defaultNaturezaOperacao: 'Venda de mercadoria',
        defaultNcm: null,
        defaultCest: null,
        defaultTaxClass: null,
        defaultOrigin: 0,
      } as any;
    }

    const apiKey =
      config?.nexosApiKey || this.configService.get<string>('FISCAL_API_KEY');
    const apiUrl = this.configService.get<string>('FISCAL_MICROSERVICE_URL');
    if (!apiKey || !apiUrl) {
      throw new BadRequestException(
        'Configuração fiscal (API Key / URL do serviço) ausente. Configure no painel ou no .env.',
      );
    }

    const [order, profile] = await Promise.all([
      this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          items: { include: { product: true } },
          delivery: true,
        },
      }),
      this.prisma.fiscalProfile.findUnique({ where: { clinicId } }),
    ]);

    if (!order) throw new BadRequestException('Pedido não encontrado');

    return { order, profile, config, apiKey, apiUrl };
  }

  private buildEmitPayload(order: any, config: any) {
    const [logradouro, numero] = (order.customer?.address || '')
      .split(',')
      .map((s: string) => s.trim());

    const customerDoc = (order.customer?.document || '').replace(/\D/g, '');
    const customerCep = (order.customer?.zipCode || '01001000').replace(
      /\D/g,
      '',
    );

    return {
      externalId: order.id,
      naturezaOperacao:
        config?.defaultNaturezaOperacao || 'Venda de mercadorias',
      finalidade: 'NORMAL',
      destinatario: {
        tipo: customerDoc.length > 11 ? 'PJ' : 'PF',
        cnpjCpf: customerDoc,
        razaoSocial: order.customer?.name,
        endereco: {
          logradouro:
            logradouro || order.customer?.address || 'Rua não informada',
          numero: order.customer?.addressNumber || numero || 'S/N',
          bairro: order.customer?.neighborhood || 'Centro',
          codigoMunicipio: order.customer?.municipioIbge || '3550308',
          municipio: order.customer?.city || 'São Paulo',
          uf: order.customer?.state || 'SP',
          cep: customerCep,
        },
      },
      itens: order.items.map((item: any) => {
        const isM2 = ['M2', 'M²'].includes(
          (item.product.unit || '').trim().toUpperCase(),
        );
        const qty =
          isM2 && item.product.boxCoverage
            ? Number((item.quantityBoxes * item.product.boxCoverage).toFixed(2))
            : item.quantityBoxes;

        const totalValue = item.totalCents / 100;
        const unitPrice = totalValue / (qty || 1);

        return {
          codigo: item.product.id.substring(0, 20),
          descricao: item.product.name,
          ncm: item.product.ncm,
          cest: item.product.cest || null,
          cfop: item.product.cfop,
          unidade: isM2 ? 'M2' : item.product.unit || 'UN',
          quantidade: qty,
          valorUnitario: Number(unitPrice.toFixed(2)),
          valorTotal: Number(totalValue.toFixed(2)),
          impostos: {
            icms: {
              cst: item.product.cst,
              aliquota: 18.0,
              baseCalculo: Number(totalValue.toFixed(2)),
            },
            pis: {
              cst: '01',
              aliquota: 1.65,
              baseCalculo: Number(totalValue.toFixed(2)),
            },
            cofins: {
              cst: '01',
              aliquota: 7.6,
              baseCalculo: Number(totalValue.toFixed(2)),
            },
          },
        };
      }),
      frete: {
        modalidade: order.deliveryFee > 0 ? 0 : 9,
        valorFrete: order.deliveryFee
          ? Number((order.deliveryFee / 100).toFixed(2))
          : 0,
      },
      pagamento: {
        tipo: 'A_VISTA',
        formas: [
          {
            meio: 'PIX',
            valor: Number(
              ((order.totalCents + (order.deliveryFee || 0)) / 100).toFixed(2),
            ),
          },
        ],
      },
    };
  }

  /**
   * Pré-flight LOCAL: valida o pedido/cadastros contra o que o ERP conhece,
   * antes de qualquer chamada ao serviço fiscal. Nunca lança — devolve a lista.
   * A validação estrutural/XSD/regras da SEFAZ fica no NexosFiscal (/nfe/validate).
   */
  private runLocalPreflight(order: any, payload: any, profile: any) {
    const erros: {
      campo: string;
      mensagem: string;
      severidade: 'error' | 'warning';
      origem: 'erp';
    }[] = [];
    const err = (campo: string, mensagem: string) =>
      erros.push({ campo, mensagem, severidade: 'error', origem: 'erp' });
    const warn = (campo: string, mensagem: string) =>
      erros.push({ campo, mensagem, severidade: 'warning', origem: 'erp' });

    // Primeiros 2 dígitos do código IBGE = código numérico da UF
    const UF_COD: Record<string, string> = {
      RO: '11', AC: '12', AM: '13', RR: '14', PA: '15', AP: '16', TO: '17',
      MA: '21', PI: '22', CE: '23', RN: '24', PB: '25', PE: '26', AL: '27',
      SE: '28', BA: '29', MG: '31', ES: '32', RJ: '33', SP: '35', PR: '41',
      SC: '42', RS: '43', MS: '50', MT: '51', GO: '52', DF: '53',
    };

    // ── Pedido ──
    if (
      ['CRIADO', 'RASCUNHO', 'AGUARDANDO_PAGAMENTO', 'CANCELADO'].includes(
        order.status,
      )
    ) {
      err(
        'pedido.status',
        `Pedido no status ${order.status} — precisa estar confirmado/pago para emitir.`,
      );
    }

    // ── Emitente (Perfil do Emitente) ──
    if (!profile) {
      err('emitente', 'Perfil do Emitente não configurado (Admin › Fiscal).');
    } else {
      if (!/^\d{14}$/.test(profile.cnpj || '')) {
        err('emitente.cnpj', 'CNPJ do emitente ausente ou inválido (14 dígitos).');
      }
      if (!profile.ie) {
        warn('emitente.ie', 'Inscrição Estadual do emitente não informada.');
      }
      if (!/^\d{2}$/.test(UF_COD[(profile.uf || '').toUpperCase()] || '')) {
        err('emitente.uf', 'UF do emitente ausente ou inválida.');
      }
      if (!/^\d{7}$/.test(profile.municipioIbge || '')) {
        err(
          'emitente.municipioIbge',
          'Código IBGE do município do emitente ausente (7 dígitos).',
        );
      } else if (
        UF_COD[(profile.uf || '').toUpperCase()] &&
        profile.municipioIbge.slice(0, 2) !==
          UF_COD[(profile.uf || '').toUpperCase()]
      ) {
        err(
          'emitente.municipioIbge',
          `Código IBGE (${profile.municipioIbge}) não corresponde à UF ${profile.uf} do emitente.`,
        );
      }
    }

    // ── Cliente / destinatário ──
    const c = order.customer;
    if (!c) {
      err('cliente', 'Pedido sem cliente associado.');
    } else {
      const doc = (c.document || '').replace(/\D/g, '');
      if (doc.length !== 11 && doc.length !== 14) {
        err('cliente.document', 'CPF/CNPJ do cliente ausente ou inválido.');
      }
      const uf = (c.state || '').toUpperCase();
      if (!UF_COD[uf]) {
        err('cliente.state', 'UF do cliente ausente ou inválida.');
      }
      if (!/^\d{7}$/.test(c.municipioIbge || '')) {
        err(
          'cliente.municipioIbge',
          'Código IBGE do município do cliente ausente (7 dígitos). Cadastre-o no cliente.',
        );
      } else if (UF_COD[uf] && c.municipioIbge.slice(0, 2) !== UF_COD[uf]) {
        err(
          'cliente.municipioIbge',
          `Código IBGE (${c.municipioIbge}) não corresponde à UF ${uf} do cliente.`,
        );
      }
      if (c.stateRegistration && c.indicadorIe !== 1) {
        warn(
          'cliente.indicadorIe',
          'Cliente tem Inscrição Estadual mas o indicador de IE não é "1 - Contribuinte".',
        );
      }
      if (!c.stateRegistration && c.indicadorIe === 1) {
        err(
          'cliente.indicadorIe',
          'Indicador de IE "1 - Contribuinte" exige Inscrição Estadual no cadastro.',
        );
      }
    }

    // ── Itens ──
    order.items.forEach((item: any, i: number) => {
      const p = item.product;
      const tag = `item[${i}] (${p.name})`;
      if (!/^\d{8}$/.test(p.ncm || '')) err(`item.ncm`, `${tag}: NCM ausente ou inválido (8 dígitos).`);
      if (!p.cfop) err(`item.cfop`, `${tag}: CFOP sugerido não cadastrado.`);
      if (!p.cst) err(`item.cst`, `${tag}: CST/CSOSN não cadastrado.`);
      if (p.origin == null) err(`item.origin`, `${tag}: Origem da mercadoria não cadastrada.`);
    });

    // ── Totais ──
    const somaItens = payload.itens.reduce(
      (s: number, it: any) => s + it.valorTotal,
      0,
    );
    const subtotal = order.subtotalCents / 100;
    if (Math.abs(somaItens - subtotal) > 0.05) {
      err(
        'totais',
        `Soma dos itens (R$ ${somaItens.toFixed(2)}) não bate com o subtotal do pedido (R$ ${subtotal.toFixed(2)}).`,
      );
    }
    if ((order.discountCents || 0) > 0) {
      warn(
        'totais.desconto',
        'O pedido tem desconto que ainda não é enviado como vDesc na NF-e (será tratado no motor de regras).',
      );
    }

    return erros;
  }

  /** Erros de item que abrem o modal de preenchimento rápido (FastInputModal). */
  private missingItemFiscalProducts(order: any) {
    return order.items
      .filter(
        (item: any) =>
          !/^\d{8}$/.test(item.product.ncm || '') ||
          !item.product.cfop ||
          !item.product.cst ||
          item.product.origin == null,
      )
      .map((i: any) => ({ id: i.product.id, name: i.product.name }));
  }

  /**
   * Dry-run: pré-flight local + POST /nfe/validate do NexosFiscal.
   * Não emite nada. Devolve a lista consolidada de erros/avisos.
   */
  async validateOrder(orderId: string, clinicId: string) {
    const { order, profile, config, apiKey, apiUrl } =
      await this.buildEmitContext(orderId, clinicId);
    const payload = this.buildEmitPayload(order, config);

    const local = this.runLocalPreflight(order, payload, profile);

    let remote: any[] = [];
    try {
      const resp = await firstValueFrom(
        this.httpService.post(`${apiUrl}/nfe/validate`, payload, {
          headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
        }),
      );
      remote = (resp.data?.erros || []).map((e: any) => ({
        campo: e.campo,
        mensagem: e.mensagem,
        severidade: e.severidade || 'error',
        origem: 'fiscal' as const,
      }));
    } catch (error: any) {
      this.logger.warn(
        `Serviço de validação fiscal indisponível: ${error.response?.status || ''} ${error.message}`,
      );
      remote = [
        {
          campo: 'servico',
          mensagem:
            'Serviço de validação fiscal indisponível — só o pré-flight local foi aplicado.',
          severidade: 'warning',
          origem: 'fiscal',
        },
      ];
    }

    const erros = [...local, ...remote];
    return {
      valido: !erros.some((e) => e.severidade === 'error'),
      erros,
      payload,
    };
  }

  async emitirNota(orderId: string, clinicId: string) {
    this.logger.log(
      `Initiating NF-e emission for Order ${orderId} in Clinic ${clinicId}`,
    );

    const { order, profile, config, apiKey, apiUrl } =
      await this.buildEmitContext(orderId, clinicId);
    const payload = this.buildEmitPayload(order, config);

    // Pré-flight local
    const local = this.runLocalPreflight(order, payload, profile);

    // Erros de item ausente → abre o FastInputModal (mantém o fluxo atual)
    const missingProducts = this.missingItemFiscalProducts(order);
    if (missingProducts.length > 0) {
      throw new BadRequestException({
        message:
          'Existem produtos sem dados fiscais completos (NCM, CFOP, CST, Origem). A emissão foi bloqueada.',
        code: 'MISSING_FISCAL_DATA',
        products: missingProducts,
      });
    }

    const hardErrors = local.filter((e) => e.severidade === 'error');
    if (hardErrors.length > 0) {
      throw new BadRequestException({
        message: 'Pré-flight fiscal falhou. Corrija os itens abaixo.',
        code: 'PREFLIGHT_FAILED',
        erros: hardErrors,
      });
    }

    const headers = {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    };

    try {
      const url = `${apiUrl}/nfe/emit`;
      await firstValueFrom(this.httpService.post(url, payload, { headers }));

      // Manual upsert since orderId is not unique
      const fiscalDoc = await this.prisma.fiscalDocument.findFirst({
        where: { orderId },
      });

      if (fiscalDoc) {
        await this.prisma.fiscalDocument.update({
          where: { id: fiscalDoc.id },
          data: {
            status: 'PROCESSING',
            type: 'NFE',
            errorMessage: null,
          },
        });
      } else {
        await this.prisma.fiscalDocument.create({
          data: {
            clinicId,
            orderId,
            status: 'PROCESSING',
            type: 'NFE',
          },
        });
      }

      return {
        status: 'PROCESSING',
        message: 'Nota Fiscal enviada para processamento assíncrono.',
      };
    } catch (error: any) {
      this.logger.error(`Error emitting NF-e: ${error.message}`, error.stack);

      // Log rejection
      const errorDoc = await this.prisma.fiscalDocument.findFirst({
        where: { orderId },
      });

      const remoteErros = error.response?.data?.erros as any[] | undefined;
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Falha na comunicação com a API Fiscal.';

      const stored =
        remoteErros && remoteErros.length
          ? `${errorMessage} — ${remoteErros
              .map((e) => `${e.campo}: ${e.mensagem}`)
              .join(' | ')}`
          : errorMessage;

      if (errorDoc) {
        await this.prisma.fiscalDocument.update({
          where: { id: errorDoc.id },
          data: { status: 'REJECTED', errorMessage: stored },
        });
      } else {
        await this.prisma.fiscalDocument.create({
          data: {
            clinicId,
            orderId,
            status: 'REJECTED',
            type: 'NFE',
            errorMessage: stored,
          },
        });
      }

      throw new BadRequestException({
        message: errorMessage,
        code: 'FISCAL_REJECTED',
        ...(remoteErros && remoteErros.length
          ? {
              erros: remoteErros.map((e) => ({ ...e, origem: 'fiscal' })),
            }
          : {}),
      });
    }
  }

  async getSettings(clinicId?: string) {
    const hasEnvCredentials = !!process.env.FISCAL_MASTER_API_KEY;

    // Super admin sem clínica selecionada: devolve só o estado do ambiente,
    // sem consultar o banco (evita findUnique com clinicId undefined → 500).
    if (!clinicId) {
      return {
        hasCredentials: hasEnvCredentials,
        source: 'env',
        environment: '2',
        defaultNaturezaOperacao: 'Venda de mercadoria',
        defaultTaxClass: null,
        defaultNcm: null,
        defaultCest: null,
        defaultCfop: null,
        defaultCst: null,
        defaultOrigin: 0,
      };
    }

    const config = await this.prisma.clinicFiscalConfig.findUnique({
      where: { clinicId },
    });

    if (!config) {
      return {
        hasCredentials: hasEnvCredentials,
        source: 'env',
        environment: '2',
        defaultNaturezaOperacao: 'Venda de mercadoria',
        defaultTaxClass: null,
        defaultNcm: null,
        defaultCest: null,
        defaultCfop: null,
        defaultCst: null,
        defaultOrigin: 0,
      };
    }

    const hasDbCredentials = !!config.nexosApiKey;

    return {
      hasCredentials: hasDbCredentials || hasEnvCredentials,
      source: hasDbCredentials ? 'database' : 'env',
      environment: config.environment,
      defaultNaturezaOperacao: config.defaultNaturezaOperacao,
      defaultTaxClass: config.defaultTaxClass,
      defaultNcm: config.defaultNcm,
      defaultCest: config.defaultCest,
      defaultCfop: config.defaultCfop,
      defaultCst: config.defaultCst,
      defaultOrigin: config.defaultOrigin,
    };
  }

  async updateSettings(clinicId: string, dto: UpdateFiscalSettingsDto) {
    return this.prisma.clinicFiscalConfig.upsert({
      where: { clinicId },
      update: { ...dto },
      create: {
        clinicId,
        ...dto,
      },
    });
  }

  // ── Perfil fiscal do emitente ──────────────────────────────────────────

  async getFiscalProfile(clinicId?: string) {
    if (!clinicId) return null;
    return this.prisma.fiscalProfile.findUnique({ where: { clinicId } });
  }

  async upsertFiscalProfile(clinicId: string, dto: UpsertFiscalProfileDto) {
    if (!clinicId) {
      throw new BadRequestException('Clínica não identificada.');
    }
    const data = {
      ...dto,
      uf: dto.uf ? dto.uf.trim().toUpperCase() : undefined,
    };
    return this.prisma.fiscalProfile.upsert({
      where: { clinicId },
      update: data,
      create: { clinicId, ...data },
    });
  }

  async handleWebhook(payload: any) {
    this.logger.log(
      `Received Webhook from NexosFiscal: ${JSON.stringify(payload)}`,
    );

    const { event, data } = payload;

    const orderId = data.externalId || data.ExternalId;

    if (!orderId) {
      this.logger.warn('Webhook payload missing externalId');
      return { status: 'IGNORED', message: 'Missing externalId' };
    }

    const fiscalDoc = await this.prisma.fiscalDocument.findFirst({
      where: { orderId },
    });

    if (!fiscalDoc) {
      this.logger.warn(`FiscalDocument not found for OrderId: ${orderId}`);
      return { status: 'NOT_FOUND', message: 'FiscalDocument not found' };
    }

    let newStatus = fiscalDoc.status;
    let errorMessage = null;

    if (event === 'NFeAuthorized') newStatus = 'APPROVED';
    else if (event === 'NFeRejected') {
      newStatus = 'REJECTED';
      errorMessage = data.rejectionReason || data.RejectionReason;
    } else if (event === 'NFeCanceled') newStatus = 'CANCELLED';

    await this.prisma.fiscalDocument.update({
      where: { id: fiscalDoc.id },
      data: {
        status: newStatus,
        uuid: data.documentId || data.DocumentId || fiscalDoc.uuid,
        key: data.accessKey || data.AccessKey || fiscalDoc.key,
        xmlUrl: data.xmlPath || data.XmlPath || fiscalDoc.xmlUrl,
        danfeUrl: data.pdfPath || data.PdfPath || fiscalDoc.danfeUrl,
        errorMessage: errorMessage,
      },
    });

    this.logger.log(
      `Updated FiscalDocument for Order ${orderId} to ${newStatus}`,
    );
    return { status: 'SUCCESS' };
  }

  /**
   * Baixa o XML autorizado ou o DANFE de um FiscalDocument, fazendo proxy
   * autenticado (X-API-Key) para o NexosFiscal. O serviço fiscal removeu o
   * acesso público a /storage, então o ERP precisa buscar pelos endpoints
   * autenticados GET /nfe/{documentId}/{xml|danfe}.
   */
  async downloadFiscalFile(
    fiscalDocumentId: string,
    clinicId: string,
    kind: 'xml' | 'danfe',
  ): Promise<{ data: Buffer; contentType: string; filename: string }> {
    const doc = await this.prisma.fiscalDocument.findFirst({
      where: { id: fiscalDocumentId, clinicId }, // escopo por clínica
    });
    if (!doc) {
      throw new NotFoundException('Documento fiscal não encontrado.');
    }
    if (!doc.uuid) {
      throw new BadRequestException(
        'Documento fiscal ainda sem referência no serviço fiscal.',
      );
    }

    const { apiUrl, apiKey } = await this.resolveFiscalCreds(clinicId);
    const path = kind === 'xml' ? 'xml' : 'danfe';

    let resp;
    try {
      resp = await firstValueFrom(
        this.httpService.get(`${apiUrl}/nfe/${doc.uuid}/${path}`, {
          headers: { 'X-API-Key': apiKey },
          responseType: 'arraybuffer',
        }),
      );
    } catch (error: any) {
      this.logger.error(
        `Falha ao baixar ${kind} do doc ${fiscalDocumentId}: ${
          error.response?.status || ''
        } ${error.message}`,
      );
      if (error.response?.status === 404) {
        throw new NotFoundException(
          `Arquivo ${kind.toUpperCase()} não disponível no serviço fiscal.`,
        );
      }
      throw new BadRequestException(
        `Não foi possível obter o ${kind.toUpperCase()} do serviço fiscal.`,
      );
    }

    const contentType = kind === 'xml' ? 'application/xml' : 'application/pdf';
    const ext = kind === 'xml' ? 'xml' : 'pdf';
    const base = doc.key || doc.uuid;
    return {
      data: Buffer.from(resp.data),
      contentType,
      filename: `${base}-${kind === 'xml' ? 'procNFe' : 'danfe'}.${ext}`,
    };
  }
}
