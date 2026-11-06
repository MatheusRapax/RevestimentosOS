import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { UpdateFiscalSettingsDto } from '../dto/update-fiscal-settings.dto';
import { UpsertFiscalProfileDto } from '../dto/upsert-fiscal-profile.dto';
import FormData from 'form-data';
import { CfopResolverService } from '../../fiscal-rules/services/cfop-resolver.service';
import { TaxCalculatorService } from '../../fiscal-rules/services/tax-calculator.service';
import {
  AGUARDANDO_SEFAZ_MENSAGEM,
  mapearStatusNexos,
  normalizarAmbiente,
  planejarWebhook,
} from './nexos-status';
import {
  dadosIeDestinatario,
  gtinParaNota,
  informacoesComplementares,
  montarPagamento,
} from './nfe-payload';
import {
  divergenciasSetupVsPerfil,
  formatCnpj,
  montarIdentidadeTenant,
} from './tenant-identity';

@Injectable()
export class FiscalService {
  private readonly logger = new Logger(FiscalService.name);

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private configService: ConfigService,
    private cfopResolver: CfopResolverService,
    private taxCalculator: TaxCalculatorService,
  ) {}

  /**
   * TRAVA DE SEGURANÇA: emissão em PRODUÇÃO (nota com valor fiscal) só é possível
   * se o servidor declarar FISCAL_ALLOW_PRODUCTION=true. Por padrão é sempre
   * homologação — em teste, dev e na produção do ERP até alguém liberar de propósito.
   */
  private isProductionAllowed(): boolean {
    return this.configService.get<string>('FISCAL_ALLOW_PRODUCTION') === 'true';
  }

  private static readonly PRODUCTION_BLOCKED_MESSAGE =
    'Emissão em PRODUÇÃO está bloqueada neste servidor: notas emitidas em produção têm valor fiscal. ' +
    'Use o ambiente de Homologação. (Liberar exige FISCAL_ALLOW_PRODUCTION=true no servidor.)';

  /** Recusa qualquer emissão enquanto a loja estiver configurada em produção e o servidor não liberou. */
  private async assertEmissionAllowed(clinicId: string) {
    if (this.isProductionAllowed()) return;
    const config = await this.prisma.clinicFiscalConfig.findUnique({
      where: { clinicId },
      select: { environment: true },
    });
    if (config?.environment === '1') {
      this.logger.error(
        `Emissão BLOQUEADA (ambiente de produção não liberado) — clinic ${clinicId}`,
      );
      throw new ForbiddenException(FiscalService.PRODUCTION_BLOCKED_MESSAGE);
    }
  }

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
    // Tenant de PRODUÇÃO só se o servidor liberou; caso contrário, sempre homologação.
    const environment =
      existing?.environment === '1' && this.isProductionAllowed()
        ? 'producao'
        : 'homologacao';

    // O Perfil do Emitente é a FONTE DA VERDADE da identidade do tenant (CNPJ, IE, CRT,
    // UF, município e endereço). Os campos opcionais do Setup só podem repetir o que o
    // perfil já tem — divergência é erro, nunca sobrescrita silenciosa.
    if (!profile) {
      throw new BadRequestException(
        'Perfil do Emitente não configurado. Preencha e salve o perfil antes de enviar o certificado.',
      );
    }
    const divergencias = divergenciasSetupVsPerfil(
      { document, ...(fiscal ?? {}) },
      profile,
    );
    if (divergencias.length) {
      throw new BadRequestException(
        'Os dados do Setup divergem do Perfil do Emitente: ' +
          divergencias.join('; ') +
          '. O perfil é a fonte da verdade: corrija o perfil, salve, e deixe esses campos do Setup vazios.',
      );
    }
    const { identidade, avisos } = montarIdentidadeTenant(profile);
    if (avisos.length) {
      this.logger.warn(`Setup fiscal clinic ${clinicId}: ${avisos.join(' | ')}`);
    }
    // POST /tenants: inclui o endereço (o transmissor real exige).
    const tenantPayload = {
      name,
      cnpj: identidade.cnpj,
      ie: identidade.ie,
      im: identidade.im,
      crt: identidade.crt,
      uf: identidade.uf,
      cityCode: identidade.cityCode,
      address: identidade.address,
      environment,
    };

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
          certificateFileName: originalFileName,
          certificateUploadedAt: new Date(),
          environment: '2', // default homologation
        },
        update: {
          nexosTenantId: tenantId,
          nexosApiKey: apiKey,
          certificateFileName: originalFileName,
          certificateUploadedAt: new Date(),
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

  private errMsg(e: any): string {
    const r = e?.getResponse?.();
    const m =
      e?.response?.data?.message ??
      (typeof r === 'object' ? r?.message : r) ??
      e?.message;
    return Array.isArray(m) ? m.join(' ') : String(m);
  }

  private masterCreds(): { masterApiKey: string; apiUrl: string } {
    const masterApiKey = this.configService.get<string>('FISCAL_MASTER_API_KEY');
    const apiUrl = this.configService.get<string>('FISCAL_MICROSERVICE_URL');
    if (!masterApiKey || !apiUrl) {
      throw new BadRequestException(
        'Serviço fiscal não configurado no servidor (FISCAL_MASTER_API_KEY / FISCAL_MICROSERVICE_URL).',
      );
    }
    return { masterApiKey, apiUrl };
  }

  /**
   * Sincroniza o Perfil do Emitente com o tenant do NexosFiscal (PUT /tenants/{id}).
   * - O CNPJ NÃO muda por PUT: se o do perfil for outro, falha e não altera nada
   *   (e nunca recria o tenant sozinha).
   * - Não envia `environment`: o ambiente do tenant não é tocado aqui.
   */
  async syncTenantFromProfile(clinicId: string) {
    const { masterApiKey, apiUrl } = this.masterCreds();
    const [config, profile] = await Promise.all([
      this.prisma.clinicFiscalConfig.findUnique({ where: { clinicId } }),
      this.prisma.fiscalProfile.findUnique({ where: { clinicId } }),
    ]);
    if (!config?.nexosTenantId) {
      throw new BadRequestException(
        'Esta loja ainda não tem cadastro no serviço fiscal. Envie o certificado em "Setup Inicial" primeiro.',
      );
    }
    if (!profile) {
      throw new BadRequestException('Perfil do Emitente não configurado.');
    }
    const { identidade, avisos } = montarIdentidadeTenant(profile);
    const headers = { 'X-API-Key': masterApiKey };
    const url = `${apiUrl}/tenants/${config.nexosTenantId}`;

    let atual: any;
    try {
      atual = (await firstValueFrom(this.httpService.get(url, { headers }))).data;
    } catch (e: any) {
      throw new BadRequestException(
        'Não foi possível consultar o cadastro no serviço fiscal: ' + this.errMsg(e),
      );
    }
    const cnpjTenant = String(atual?.cnpj ?? atual?.Cnpj ?? '').replace(/\D/g, '');
    if (cnpjTenant && cnpjTenant !== identidade.cnpj) {
      throw new BadRequestException(
        `O CNPJ do perfil (${formatCnpj(identidade.cnpj)}) não bate com o do tenant fiscal (${formatCnpj(cnpjTenant)}); ` +
          'é preciso recriar o tenant e subir o certificado de novo. Nada foi alterado.',
      );
    }

    // Sem `environment` e sem `cnpj` (imutável).
    const body = {
      ie: identidade.ie,
      im: identidade.im,
      crt: identidade.crt,
      uf: identidade.uf,
      cityCode: identidade.cityCode,
      address: identidade.address,
    };
    try {
      const res = await firstValueFrom(
        this.httpService.put(url, body, { headers }),
      );
      const t = res.data ?? {};
      return {
        synced: true,
        avisos,
        tenant: {
          cnpj: t.cnpj ?? cnpjTenant,
          ie: t.ie ?? null,
          crt: t.crt ?? null,
          uf: t.uf ?? null,
          cityCode: t.cityCode ?? null,
          environment: t.environment ?? null,
          address: t.address ?? null,
        },
      };
    } catch (e: any) {
      throw new BadRequestException(
        'O serviço fiscal recusou a atualização do emitente: ' + this.errMsg(e),
      );
    }
  }

  /**
   * Status do certificado/SEFAZ (GET /sefaz/status do NexosFiscal). Não emite nada.
   * Devolve alertas em português para a tela.
   */
  async getSefazStatus(clinicId: string) {
    const { apiUrl, apiKey } = await this.resolveFiscalCreds(clinicId);
    let d: any;
    try {
      d = (
        await firstValueFrom(
          this.httpService.get(`${apiUrl}/sefaz/status`, {
            headers: { 'X-API-Key': apiKey },
          }),
        )
      ).data;
    } catch (e: any) {
      if (e?.response?.status === 404) {
        return {
          available: true,
          hasCertificate: false,
          alertas: [
            {
              nivel: 'erro' as const,
              mensagem: 'O serviço fiscal não tem certificado ativo para esta loja.',
            },
          ],
        };
      }
      return {
        available: false,
        alertas: [
          {
            nivel: 'erro' as const,
            mensagem:
              'Não foi possível consultar o serviço fiscal: ' + this.errMsg(e),
          },
        ],
      };
    }

    const c = d?.certificado ?? {};
    const alertas: { nivel: 'erro' | 'aviso'; mensagem: string }[] = [];
    if (c.cnpjMatchesTenant === false) {
      alertas.push({
        nivel: 'erro',
        mensagem: `O CNPJ do certificado (${c.cnpj ? formatCnpj(c.cnpj) : '—'}) NÃO confere com o do cadastro fiscal da loja. A emissão será recusada.`,
      });
    }
    if (c.expired === true) {
      alertas.push({ nivel: 'erro', mensagem: 'O certificado digital está VENCIDO.' });
    } else if (c.notAfterUtc) {
      const dias = Math.floor(
        (new Date(c.notAfterUtc).getTime() - Date.now()) / 86400000,
      );
      if (dias <= 30) {
        alertas.push({ nivel: 'aviso', mensagem: `O certificado vence em ${dias} dia(s).` });
      }
    }
    if (d?.reachable === false) {
      alertas.push({
        nivel: 'aviso',
        mensagem:
          'A SEFAZ não respondeu à consulta de status' +
          (d?.erro ? `: ${d.erro}` : '.'),
      });
    }
    if (d?.ambiente && d.ambiente !== 'homologacao') {
      alertas.push({
        nivel: 'erro',
        mensagem: `O cadastro fiscal está em "${d.ambiente}" (não é homologação). Notas emitidas assim têm valor fiscal.`,
      });
    }
    return {
      available: true,
      hasCertificate: true,
      ambiente: d?.ambiente ?? null,
      uf: d?.uf ?? null,
      reachable: d?.reachable ?? null,
      cStat: d?.cStat ?? null,
      motivo: d?.motivo ?? null,
      certificado: {
        subject: c.subject ?? null,
        cnpj: c.cnpj ?? null,
        notBeforeUtc: c.notBeforeUtc ?? null,
        notAfterUtc: c.notAfterUtc ?? null,
        expired: c.expired ?? null,
        cnpjMatchesTenant: c.cnpjMatchesTenant ?? null,
      },
      alertas,
    };
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
          payments: true,
        },
      }),
      this.prisma.fiscalProfile.findUnique({ where: { clinicId } }),
    ]);

    if (!order) throw new BadRequestException('Pedido não encontrado');

    return { order, profile, config, apiKey, apiUrl };
  }

  /**
   * Monta o payload de emissão. CFOP e tributos (ICMS/PIS/COFINS/IPI) vêm do
   * motor de regras fiscais (CfopResolverService + TaxCalculatorService,
   * Fase 1/0.4) — o `cfop`/`cst` cadastrados no produto seguem servindo como
   * dado de referência/fallback e são validados no pré-flight.
   *
   * Limite conhecido: o payload do NexosFiscal só transporta
   * icms{cst,aliquota,baseCalculo}/pis/cofins — ICMS-ST, FCP, DIFAL e IPI já
   * são calculados (ver `avisosFiscais` no retorno) mas ainda não têm campo
   * de transmissão no serviço; ficam disponíveis para log/tela de revisão.
   */
  private async buildEmitPayload(order: any, config: any, profile: any) {
    const [logradouro, numero] = (order.customer?.address || '')
      .split(',')
      .map((s: string) => s.trim());

    const customerDoc = (order.customer?.document || '').replace(/\D/g, '');
    const customerCep = (order.customer?.zipCode || '01001000').replace(
      /\D/g,
      '',
    );

    // Sem UF padrão: se faltar a UF do emitente ou do cliente, o pré-flight
    // bloqueia a emissão (emitente.uf / cliente.state). Assumir "SP" aqui
    // transformaria uma venda local numa interestadual sem avisar ninguém.
    const ufOrigem = (profile?.uf || '').trim().toUpperCase();
    const ufDestino = (order.customer?.state || '').trim().toUpperCase();
    const consumidorFinal = order.customer?.consumidorFinal ?? true;
    const contribuinte = order.customer?.indicadorIe === 1;
    const regime = profile?.crt ?? 3;

    const avisosFiscais: string[] = [];

    // Tipo de operação (dentro/fora do estado) — só para a tela de revisão.
    // Nunca é escolhido pelo operador: sai do estado do emitente × do cliente.
    const operacaoResolvida =
      ufOrigem && ufDestino
        ? this.cfopResolver.resolve({
            operacao: 'VENDA',
            ufOrigem,
            ufDestino,
            destinatarioContribuinte: contribuinte,
            consumidorFinal,
          })
        : null;
    const _operacao = operacaoResolvida
      ? {
          ufOrigem,
          ufDestino,
          interestadual: operacaoResolvida.interestadual,
          descricao: operacaoResolvida.descricao,
        }
      : null;

    const pagamento = montarPagamento(order.payments, order.totalCents);

    const itens = await Promise.all(
      order.items.map(async (item: any) => {
        const isM2 = ['M2', 'M²'].includes(
          (item.product.unit || '').trim().toUpperCase(),
        );
        const qty =
          isM2 && item.product.boxCoverage
            ? Number((item.quantityBoxes * item.product.boxCoverage).toFixed(2))
            : item.quantityBoxes;

        const totalValue = item.totalCents / 100;
        const unitPrice = totalValue / (qty || 1);

        const cfopResolvido = this.cfopResolver.resolve({
          operacao: 'VENDA',
          ufOrigem,
          ufDestino,
          destinatarioContribuinte: contribuinte,
          consumidorFinal,
        });

        const tax = await this.taxCalculator.calcular(
          {
            clinicId: order.clinicId,
            ufOrigem,
            ufDestino,
            regime,
            consumidorFinal,
            contribuinte,
          },
          { ncm: item.product.ncm, origin: item.product.origin, baseCalculo: Number(totalValue.toFixed(2)) },
        );
        avisosFiscais.push(...tax.avisos);

        return {
          codigo: item.product.id.substring(0, 20),
          descricao: item.product.name,
          ncm: item.product.ncm,
          cest: item.product.cest || null,
          gtin: gtinParaNota(item.product.gtin),
          cfop: cfopResolvido.cfop,
          unidade: isM2 ? 'M2' : item.product.unit || 'UN',
          quantidade: qty,
          valorUnitario: Number(unitPrice.toFixed(2)),
          valorTotal: Number(totalValue.toFixed(2)),
          impostos: {
            // origem (0 a 8) vai no XML; sem ela o serviço assume 0 (nacional), errado para importado
            icms: {
              cst: tax.icms.cst,
              aliquota: tax.icms.aliquota,
              baseCalculo: tax.icms.vBC,
              origem: item.product.origin ?? undefined,
            },
            pis: {
              cst: tax.pis.cst,
              aliquota: tax.pis.aliquota,
              baseCalculo: tax.pis.vBC,
              origem: item.product.origin ?? undefined,
            },
            cofins: {
              cst: tax.cofins.cst,
              aliquota: tax.cofins.aliquota,
              baseCalculo: tax.cofins.vBC,
              origem: item.product.origin ?? undefined,
            },
          },
          // Calculados para referência/relatório — sem campo de transmissão
          // no NexosFiscal ainda (ver nota acima).
          _fiscalCalculado: {
            icmsSt: tax.icmsSt,
            fcp: tax.fcp,
            difal: tax.difal,
            ipi: tax.ipi,
            regrasAplicadas: tax.regrasAplicadas,
          },
        };
      }),
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
        ...dadosIeDestinatario(order.customer || {}),
        endereco: {
          logradouro:
            logradouro || order.customer?.address || 'Rua não informada',
          numero: order.customer?.addressNumber || numero || 'S/N',
          complemento: order.customer?.complement || undefined,
          bairro: order.customer?.neighborhood || 'Centro',
          // Sem município/UF "padrão de São Paulo": o pré-flight exige os
          // dados reais do cliente antes de qualquer transmissão.
          codigoMunicipio: order.customer?.municipioIbge || '',
          municipio: order.customer?.city || '',
          uf: ufDestino,
          cep: customerCep,
        },
      },
      itens,
      _operacao,
      // Desconto do pedido (o serviço rateia entre os itens e fecha no centavo)
      ...(order.discountCents > 0
        ? { desconto: Number((order.discountCents / 100).toFixed(2)) }
        : {}),
      ...(informacoesComplementares(order.notes)
        ? { informacoesComplementares: informacoesComplementares(order.notes) }
        : {}),
      frete: {
        modalidade: order.deliveryFee > 0 ? 0 : 9,
        valorFrete: order.deliveryFee
          ? Number((order.deliveryFee / 100).toFixed(2))
          : 0,
      },
      // totalCents do pedido já inclui o frete (subtotal - desconto + frete): não somar de novo.
      pagamento: {
        tipo: 'A_VISTA',
        formas: pagamento.formas,
      },
      _pagamento: { fecha: pagamento.fecha, avisos: pagamento.avisos },
      avisosFiscais,
    };
  }

  /**
   * O NexosFiscal ainda não tem campos para os cálculos extras (ICMS-ST,
   * FCP, DIFAL, IPI) nem para os avisos internos — remove-os antes de
   * transmitir, mantendo-os só na resposta local (preflight/tela de revisão).
   */
  private toTransmissionPayload(payload: any) {
    const { avisosFiscais, _operacao, _pagamento, ...rest } = payload;
    return {
      ...rest,
      itens: payload.itens.map((item: any) => {
        const { _fiscalCalculado, ...itemRest } = item;
        return itemRest;
      }),
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
      } else if (/^isento$/i.test(profile.ie.trim())) {
        warn(
          'emitente.ie',
          'Inscrição Estadual do emitente está como ISENTO; empresa que vende mercadoria costuma ter IE. Confirme com o contador.',
        );
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
        err(
          'cliente.state',
          'O cliente não tem o estado (UF) cadastrado. Ele define se a venda é dentro ou fora do estado; edite o cadastro do cliente para continuar.',
        );
      }
      if (!(c.city || '').trim()) {
        err(
          'cliente.city',
          'O cliente não tem a cidade cadastrada. Edite o cadastro do cliente para continuar.',
        );
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
      if (c.indicadorIe === 1 && doc.length === 11) {
        err(
          'cliente.indicadorIe',
          'Cliente com CPF não pode ser contribuinte de ICMS (indicador "1"). Ajuste o indicador no cadastro do cliente.',
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
    // CFOP e CST NÃO são exigidos do produto: saem do motor de regras fiscais
    // (CfopResolverService/TaxCalculatorService). Do produto só vêm a
    // classificação (NCM) e a origem.
    order.items.forEach((item: any) => {
      const p = item.product;
      if (!/^\d{8}$/.test(p.ncm || '')) {
        err('item.ncm', `${p.name}: falta a classificação fiscal (NCM, 8 dígitos).`);
      }
      if (p.origin == null) {
        err('item.origin', `${p.name}: falta informar a origem da mercadoria (nacional ou importada).`);
      }
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
    // O desconto do pedido agora é enviado (vDesc) e rateado pelo serviço; só não pode passar dos itens.
    if ((order.discountCents || 0) / 100 > somaItens + 0.005) {
      err(
        'totais.desconto',
        `O desconto do pedido (R$ ${(order.discountCents / 100).toFixed(2)}) é maior que a soma dos itens (R$ ${somaItens.toFixed(2)}).`,
      );
    }

    // Forma de pagamento real (pagamentos aprovados do pedido)
    for (const aviso of payload._pagamento?.avisos ?? []) {
      warn('pagamento', aviso);
    }

    return erros;
  }

  /** Erros de item que abrem o modal de preenchimento rápido (FastInputModal). */
  private missingItemFiscalProducts(order: any) {
    return order.items
      .filter(
        (item: any) =>
          !/^\d{8}$/.test(item.product.ncm || '') ||
          item.product.origin == null,
      )
      .map((i: any) => ({
        id: i.product.id,
        name: i.product.name,
        // Devolve o que já está cadastrado — mesmo que falte só um campo
        // (ex.: só a Origem), o operador não deveria ter que redigitar NCM/
        // CFOP/CST que já estão corretos no produto.
        ncm: i.product.ncm || undefined,
        cfop: i.product.cfop || undefined,
        cst: i.product.cst || undefined,
        cest: i.product.cest || undefined,
        origin: i.product.origin ?? undefined,
        gtin: i.product.gtin || undefined,
      }));
  }

  /**
   * Dry-run: pré-flight local + POST /nfe/validate do NexosFiscal.
   * Não emite nada. Devolve a lista consolidada de erros/avisos.
   */
  async validateOrder(orderId: string, clinicId: string) {
    const { order, profile, config, apiKey, apiUrl } =
      await this.buildEmitContext(orderId, clinicId);
    const payload = await this.buildEmitPayload(order, config, profile);

    const local = this.runLocalPreflight(order, payload, profile);

    // Com erro local (dado faltando no cadastro) o serviço fiscal só repetiria o
    // problema em inglês; corrigido o cadastro, a validação remota roda.
    if (local.some((e) => e.severidade === 'error')) {
      return {
        valido: false,
        erros: local,
        payload,
      };
    }

    let remote: any[] = [];
    try {
      const resp = await firstValueFrom(
        this.httpService.post(
          `${apiUrl}/nfe/validate`,
          this.toTransmissionPayload(payload),
          {
            headers: {
              'X-API-Key': apiKey,
              'Content-Type': 'application/json',
            },
          },
        ),
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

  /** Mapeia o `status` textual do NexosFiscal (resposta de dedupe do /nfe/emit,
   * consulta GET /nfe e eventos) para o enum FiscalStatus do ERP.
   * FAILED vira rejeitada; PENDING/PROCESSING/AWAITING_SEFAZ ficam "em andamento". */
  private mapNexosDedupeStatus(
    status: string,
  ): 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'PROCESSING' {
    const r = mapearStatusNexos(status);
    if (!r.conhecido) {
      this.logger.warn(
        `Status desconhecido do NexosFiscal: "${status}" — tratado como em andamento.`,
      );
    }
    return r.status;
  }

  async emitirNota(orderId: string, clinicId: string) {
    this.logger.log(
      `Initiating NF-e emission for Order ${orderId} in Clinic ${clinicId}`,
    );
    await this.assertEmissionAllowed(clinicId);

    const { order, profile, config, apiKey, apiUrl } =
      await this.buildEmitContext(orderId, clinicId);
    const payload = await this.buildEmitPayload(order, config, profile);

    // Pré-flight local
    const local = this.runLocalPreflight(order, payload, profile);

    // Erros de item ausente → abre o FastInputModal (mantém o fluxo atual)
    const missingProducts = this.missingItemFiscalProducts(order);
    if (missingProducts.length > 0) {
      throw new BadRequestException({
        message:
          'Existem produtos sem dados fiscais (NCM e origem). A emissão foi bloqueada.',
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
      const resp = await firstValueFrom(
        this.httpService.post(url, this.toTransmissionPayload(payload), {
          headers,
        }),
      );

      // Manual upsert since orderId is not unique
      const fiscalDoc = await this.prisma.fiscalDocument.findFirst({
        where: { orderId },
      });

      // O NexosFiscal deduplica por externalId: se o documento já existe
      // (204→200 "Document already exists", com o `status` real no corpo),
      // não é uma nova emissão — ele nunca vai disparar um novo webhook para
      // este pedido. Sincroniza direto com esse status em vez de sobrescrever
      // para PROCESSING, senão o documento fica "PROCESSING" para sempre.
      const dedupeStatus: string | undefined = resp.data?.status;
      if (dedupeStatus) {
        const mapped = this.mapNexosDedupeStatus(dedupeStatus);
        const rawStatus = String(dedupeStatus).toUpperCase();
        const data = {
          status: mapped,
          type: 'NFE' as const,
          uuid: resp.data?.documentId || fiscalDoc?.uuid,
          // AWAITING_SEFAZ: rejectionReason é só o último erro de comunicação, não rejeição.
          errorMessage:
            mapped === 'REJECTED'
              ? resp.data?.rejectionReason ||
                fiscalDoc?.errorMessage ||
                (rawStatus === 'FAILED'
                  ? 'Falha definitiva no processamento da nota no serviço fiscal.'
                  : 'Nota rejeitada pela SEFAZ.')
              : null,
        };
        if (fiscalDoc) {
          await this.prisma.fiscalDocument.update({
            where: { id: fiscalDoc.id },
            data,
          });
        } else {
          await this.prisma.fiscalDocument.create({
            data: { clinicId, orderId, ...data },
          });
        }

        const messages: Record<string, string> = {
          APPROVED: 'Esta Nota Fiscal já havia sido emitida e autorizada.',
          REJECTED:
            'Esta Nota Fiscal já foi emitida e rejeitada pela SEFAZ — corrija os dados e reemita.',
          CANCELLED: 'Esta Nota Fiscal já havia sido cancelada.',
          PROCESSING:
            rawStatus === 'AWAITING_SEFAZ'
              ? AGUARDANDO_SEFAZ_MENSAGEM
              : 'Nota Fiscal já está em processamento.',
        };
        return {
          status: mapped,
          message:
            (rawStatus === 'FAILED'
              ? 'A emissão falhou no serviço fiscal — corrija os dados e reemita.'
              : messages[mapped]) || 'Nota Fiscal já emitida para este pedido.',
        };
      }

      // Caminho normal: NexosFiscal aceitou uma emissão nova (202) e vai
      // processar de forma assíncrona, avisando via webhook.
      if (fiscalDoc) {
        await this.prisma.fiscalDocument.update({
          where: { id: fiscalDoc.id },
          data: {
            status: 'PROCESSING',
            type: 'NFE',
            uuid: resp.data?.documentId || fiscalDoc.uuid,
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
            uuid: resp.data?.documentId,
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
    const settings = await this.getSettingsRaw(clinicId);
    // A tela usa isto para travar a opção "Produção" e avisar quando o ambiente salvo é produção
    return { ...settings, productionAllowed: this.isProductionAllowed() };
  }

  private async getSettingsRaw(clinicId?: string) {
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
      // O setup só grava tenant/chave depois que o NexosFiscal aceitou o certificado
      hasCertificate: !!config.nexosTenantId && hasDbCredentials,
      certificateFileName: config.certificateFileName,
      certificateUploadedAt: config.certificateUploadedAt,
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
    if (dto.environment === '1' && !this.isProductionAllowed()) {
      throw new ForbiddenException(FiscalService.PRODUCTION_BLOCKED_MESSAGE);
    }
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
    const saved = await this.prisma.fiscalProfile.upsert({
      where: { clinicId },
      update: data,
      create: { clinicId, ...data },
    });

    // Perfil é a fonte da verdade: se a loja já tem tenant no serviço fiscal, reflete lá.
    // Falha de sincronização NÃO desfaz o salvamento do perfil; vai como aviso para a tela.
    let sync: { ok: boolean; skipped?: boolean; message?: string; avisos?: string[] } = {
      ok: false,
      skipped: true,
    };
    const config = await this.prisma.clinicFiscalConfig.findUnique({
      where: { clinicId },
      select: { nexosTenantId: true },
    });
    if (config?.nexosTenantId) {
      try {
        const r = await this.syncTenantFromProfile(clinicId);
        sync = { ok: true, avisos: r.avisos };
      } catch (e: any) {
        sync = { ok: false, message: this.errMsg(e) };
      }
    }
    return { ...saved, sync };
  }

  async handleWebhook(payload: any) {
    this.logger.log(
      `Received Webhook from NexosFiscal: ${JSON.stringify(payload)}`,
    );

    const { event, data } = payload || {};
    if (!data || typeof data !== 'object') {
      this.logger.warn('Webhook sem corpo de dados — ignorado');
      return { status: 'IGNORED', message: 'Missing data' };
    }

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

    // O que o evento muda (ou não): evento sem efeito ou desconhecido é ignorado
    // com sucesso (200) — nunca erro, para o serviço não reentregar à toa.
    const plano = planejarWebhook(event, data, fiscalDoc);
    if (plano.acao === 'ignorar') {
      this.logger.log(
        `Webhook ${event ?? '(sem evento)'} ignorado para Order ${orderId}: ${plano.motivo}`,
      );
      return { status: 'IGNORED', message: plano.motivo };
    }

    await this.prisma.fiscalDocument.update({
      where: { id: fiscalDoc.id },
      data: plano.dados,
    });

    this.logger.log(
      `Updated FiscalDocument for Order ${orderId}: ${plano.resumo}`,
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
