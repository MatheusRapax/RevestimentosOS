import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
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
  detalheAguardandoSefaz,
  mapearStatusNexos,
  mensagemDoServico,
  normalizarAmbiente,
  normalizarErrosRemotos,
  planejarWebhook,
} from './nexos-status';
import {
  alertasDoStatus,
  avaliarAlertaCertificado,
  dataDeValidade,
  lerEventoCertificado,
} from './certificado-alerta';
import {
  resolverSegredoWebhook,
  validarUrlWebhook,
  webhookDoErpAtivo,
} from './webhook-cadastro';
import {
  dadosIeDestinatario,
  gtinParaNota,
  informacoesComplementares,
  montarPagamento,
} from './nfe-payload';
import { cstNaoSuportados, tributosNaoTransmitidos } from './cst-suportados';
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

    const [existing, profile] = await Promise.all([
      this.prisma.clinicFiscalConfig.findUnique({ where: { clinicId } }),
      this.prisma.fiscalProfile.findUnique({ where: { clinicId } }),
    ]);

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

    // A19: a loja que já tem empresa no serviço NUNCA cria outra. O serviço aceita dois tenants com o
    // mesmo CNPJ e a numeração do novo recomeçaria do 1 (a SEFAZ recusa número repetido). Renovar o A1
    // ou reenviar depois de errar a senha só troca o certificado do tenant que já existe.
    if (existing?.nexosTenantId && existing?.nexosApiKey) {
      return this.reenviarCertificado(clinicId, existing.nexosApiKey, {
        apiUrl,
        name,
        pfxBuffer,
        password,
        originalFileName,
      });
    }

    // POST /tenants: inclui o endereço (o transmissor real exige).
    // A20: o tenant nasce SEMPRE em homologação; produção só pela troca de ambiente na Configuração
    // Fiscal, que muda o tenant no serviço (PUT /tenants/{id}).
    const tenantPayload = {
      name,
      cnpj: identidade.cnpj,
      ie: identidade.ie,
      im: identidade.im,
      crt: identidade.crt,
      uf: identidade.uf,
      cityCode: identidade.cityCode,
      address: identidade.address,
      environment: 'homologacao',
    };

    try {
      this.logger.log(`Starting NexosFiscal setup for clinic ${clinicId}`);

      // 1. Create Tenant (só na primeira vez; se uma tentativa anterior criou o tenant e não chegou a
      // gerar a chave, reaproveita o mesmo tenant em vez de criar outro)
      let tenantId = existing?.nexosTenantId ?? null;
      if (!tenantId) {
        const createTenantRes = await firstValueFrom(
          this.httpService.post(`${apiUrl}/tenants`, tenantPayload, {
            headers: { 'X-API-Key': masterApiKey },
          }),
        );
        tenantId = createTenantRes.data.id as string;
        // Guarda o tenant na hora: se a chave falhar, a próxima tentativa não cria outra empresa
        await this.prisma.clinicFiscalConfig.upsert({
          where: { clinicId },
          create: { clinicId, nexosTenantId: tenantId, environment: '2' },
          update: {
            nexosTenantId: tenantId,
            nexosApiKey: null,
            environment: '2',
          },
        });
        this.logger.log(`Tenant created: ${tenantId}`);
      } else {
        this.logger.log(
          `Tenant ${tenantId} já existe sem chave: gerando a chave`,
        );
      }

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

      // Tenant e chave ficam gravados antes do certificado: senha errada ou arquivo recusado não
      // perdem o tenant, e o próximo envio cai no caminho de reenvio (A19) em vez de criar outro.
      // Sem certificado aceito, hasCertificate continua falso (certificateUploadedAt nulo).
      await this.prisma.clinicFiscalConfig.upsert({
        where: { clinicId },
        create: {
          clinicId,
          nexosTenantId: tenantId,
          nexosApiKey: apiKey,
          environment: '2',
        },
        update: {
          nexosTenantId: tenantId,
          nexosApiKey: apiKey,
          environment: '2',
          certificateFileName: null,
          certificateUploadedAt: null,
        },
      });

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
      await this.prisma.clinicFiscalConfig.update({
        where: { clinicId },
        data: {
          certificateFileName: originalFileName,
          certificateUploadedAt: new Date(),
          // certificado novo: o aviso do anterior deixa de valer (a tela relê a validade em seguida)
          certificateNotAfter: null,
          certificateAlertAt: null,
        },
      });

      // Sem webhook cadastrado o serviço não avisa de nada (A17); a falha não desfaz o certificado,
      // mas vai para a tela.
      const webhook = await this.registrarWebhook(clinicId);

      return {
        success: true,
        message: 'Configuração fiscal concluída com sucesso',
        webhook,
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

  /**
   * A19: troca o certificado do tenant que a loja já tem, sem criar empresa nova. Sincroniza o perfil
   * (PUT /tenants/{id}), envia o certificado com a chave guardada (o novo vira o ativo) e recadastra o
   * webhook. Chave recusada (401) vira erro para o operador: nunca recria a empresa sozinho.
   */
  private async reenviarCertificado(
    clinicId: string,
    apiKey: string,
    arquivo: {
      apiUrl: string;
      name: string;
      pfxBuffer: Buffer;
      password: string;
      originalFileName: string;
    },
  ) {
    this.logger.log(
      `Reenvio de certificado para o tenant existente — clinic ${clinicId}`,
    );
    // 1. Perfil → tenant. CNPJ diferente ou tenant inexistente no serviço: erro, nada é recriado.
    await this.syncTenantFromProfile(clinicId);

    // 2. Certificado com a chave que a loja já tem
    const form = new FormData();
    form.append('file', arquivo.pfxBuffer, {
      filename: arquivo.originalFileName,
    });
    form.append('password', arquivo.password);
    form.append('name', `${arquivo.name} - A1`);
    try {
      await firstValueFrom(
        this.httpService.post(`${arquivo.apiUrl}/certificate`, form, {
          headers: { ...form.getHeaders(), 'X-API-Key': apiKey },
        }),
      );
    } catch (e: any) {
      if (e?.response?.status === 401) {
        this.logger.error(
          `Chave do tenant recusada (401) no reenvio do certificado — clinic ${clinicId}`,
        );
        throw new BadRequestException(
          'O serviço fiscal não aceita mais a chave guardada desta loja (401). Nada foi alterado e ' +
            'nenhuma empresa nova foi criada: a numeração das notas continua a mesma. Peça ao suporte ' +
            'uma chave nova para o cadastro fiscal desta loja e envie o certificado de novo.',
        );
      }
      throw new BadRequestException(
        'O serviço fiscal recusou o certificado: ' + this.errMsg(e),
      );
    }

    // 3. Local: só o certificado muda; tenant, chave e ambiente continuam os mesmos
    await this.prisma.clinicFiscalConfig.update({
      where: { clinicId },
      data: {
        certificateFileName: arquivo.originalFileName,
        certificateUploadedAt: new Date(),
        certificateNotAfter: null,
        certificateAlertAt: null,
      },
    });

    // 4. Webhook (idempotente no serviço)
    const webhook = await this.registrarWebhook(clinicId);
    return {
      success: true,
      message:
        'Certificado atualizado no cadastro fiscal que a loja já tinha (mesma empresa e numeração).',
      webhook,
    };
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
        await this.guardarValidadeCertificado(clinicId, null);
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
    const validade = alertasDoStatus(c);
    alertas.push(...validade.alertas);
    // A resposta do serviço é a fonte da verdade: mantém o aviso do administrador em dia
    const notAfter = dataDeValidade(c.notAfterUtc);
    if (notAfter) await this.guardarValidadeCertificado(clinicId, notAfter);
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
        daysLeft: validade.daysLeft,
        level: validade.level,
      },
      alertas,
    };
  }

  /** Falhar aqui não pode derrubar a consulta de status: o aviso é só um complemento. */
  private async guardarValidadeCertificado(
    clinicId: string,
    notAfter: Date | null,
  ) {
    try {
      await this.prisma.clinicFiscalConfig.updateMany({
        where: { clinicId },
        data: { certificateNotAfter: notAfter },
      });
    } catch (e: any) {
      this.logger.warn(
        `Não foi possível guardar a validade do certificado: ${this.errMsg(e)}`,
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
      _pagamento: {
        fecha: pagamento.fecha,
        excede: pagamento.excede,
        avisos: pagamento.avisos,
      },
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
      if (![1, 2, 3].includes(Number(profile.crt))) {
        err(
          'emitente.crt',
          'Regime Tributário (CRT) do emitente não informado. Escolha o regime no Perfil do Emitente e salve.',
        );
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

    // Impostos que o serviço fiscal ainda não consegue transmitir (A2): bloqueia com mensagem clara
    payload.itens.forEach((it: any) => {
      const problemas = cstNaoSuportados(profile?.crt, it.impostos);
      if (problemas.length > 0) {
        err(
          'tributos.cst',
          `${it.descricao}: o serviço fiscal ainda não emite ${problemas.join('; ')}. Ajuste as regras fiscais com o contador (a nota não é enviada com tributo errado).`,
        );
      }
      const extras = tributosNaoTransmitidos(it._fiscalCalculado);
      if (extras.length > 0) {
        warn(
          'tributos.nao-transmitido',
          `${it.descricao}: ${extras.join(', ')} foi calculado, mas o serviço fiscal ainda não transmite; a nota sairá sem esse valor. Confirme com o contador antes de emitir em produção.`,
        );
      }
    });

    // Forma de pagamento real (pagamentos aprovados do pedido)
    // Soma MAIOR que o total é recusada pelo serviço fiscal (erro); menor só avisa (a SEFAZ aceita).
    for (const aviso of payload._pagamento?.avisos ?? []) {
      if (payload._pagamento?.excede) {
        err(
          'pagamento',
          `${aviso} Corrija os pagamentos do pedido antes de emitir.`,
        );
      } else {
        warn('pagamento', aviso);
      }
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
      remote = (resp.data?.erros || []).map((e: any) => {
        // erro de item ("itens[1].cest"): diz de qual produto é, pelo nome
        const idx = /^itens\[(\d+)\]/i.exec(String(e.campo ?? ''))?.[1];
        const produto =
          idx !== undefined ? payload.itens?.[Number(idx)]?.descricao : undefined;
        return {
          campo: e.campo,
          mensagem: produto ? `${produto}: ${e.mensagem}` : e.mensagem,
          severidade: e.severidade || 'error',
          origem: 'fiscal' as const,
        };
      });
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
        // A20: ambiente da nota que já existe, lido do serviço
        const ambienteExistente = await this.ambienteDaNota(
          apiUrl,
          apiKey,
          resp.data?.documentId || fiscalDoc?.uuid || undefined,
        );
        const data = {
          status: mapped,
          type: 'NFE' as const,
          uuid: resp.data?.documentId || fiscalDoc?.uuid,
          ...(ambienteExistente ? { environment: ambienteExistente } : {}),
          // AWAITING_SEFAZ: rejectionReason é só o último erro de comunicação, não rejeição.
          errorMessage:
            mapped === 'REJECTED'
              ? resp.data?.rejectionReason ||
                fiscalDoc?.errorMessage ||
                (rawStatus === 'FAILED'
                  ? 'Falha definitiva no processamento da nota no serviço fiscal.'
                  : 'Nota rejeitada pela SEFAZ.')
              : null,
          remoteStatus: rawStatus,
          statusDetail:
            rawStatus === 'AWAITING_SEFAZ'
              ? detalheAguardandoSefaz(
                  resp.data?.rejectionReason,
                  resp.data?.attempts,
                )
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
      // A20: o ambiente é o que o serviço gravou na nota, não a configuração local.
      const ambiente = await this.ambienteDaNota(
        apiUrl,
        apiKey,
        resp.data?.documentId,
      );
      if (fiscalDoc) {
        await this.prisma.fiscalDocument.update({
          where: { id: fiscalDoc.id },
          data: {
            status: 'PROCESSING',
            type: 'NFE',
            uuid: resp.data?.documentId || fiscalDoc.uuid,
            errorMessage: null,
            remoteStatus: null,
            statusDetail: null,
            // sem resposta do serviço fica vazio (a nota anterior podia ser de outro ambiente)
            environment: ambiente,
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
            ...(ambiente ? { environment: ambiente } : {}),
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

      // O 400 do serviço pode vir como { message, erros[] } ou como ProblemDetails { errors{} }
      const remoteErros = normalizarErrosRemotos(error.response?.data);
      const errorMessage =
        error.response?.data?.message ||
        (remoteErros.length
          ? 'O serviço fiscal recusou os dados da nota.'
          : error.response?.data?.title) ||
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
      // (A19: o tenant e a chave são gravados antes do certificado; sem certificado aceito, não tem)
      hasCertificate:
        !!config.nexosTenantId &&
        hasDbCredentials &&
        !!config.certificateUploadedAt,
      certificateFileName: config.certificateFileName,
      certificateUploadedAt: config.certificateUploadedAt,
      webhookUrl: config.webhookUrl,
      webhookRegisteredAt: config.webhookRegisteredAt,
      webhookError: config.webhookError,
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
    // A20: o ambiente vale no serviço fiscal; a troca local só é gravada depois que ele aceitar
    await this.trocarAmbienteNoServico(clinicId, dto.environment);
    const salvo = await this.prisma.clinicFiscalConfig.upsert({
      where: { clinicId },
      update: { ...dto },
      create: {
        clinicId,
        ...dto,
      },
    });
    // Repetir é seguro (A17: mesma URL e tipo atualiza): mantém o webhook em dia a cada salvamento
    const webhook = salvo.nexosTenantId
      ? await this.registrarWebhook(clinicId)
      : { ok: false, skipped: true };
    return { ...salvo, webhook };
  }

  /**
   * A20: trocar a loja de ambiente muda o tenant no serviço (PUT /tenants/{id}, chave mestra), porque é
   * o ambiente do tenant que vai em cada nota. Lança se o serviço não aceitar: nesse caso nada é gravado
   * no ERP. Sem mudança de ambiente, não chama o serviço.
   */
  private async trocarAmbienteNoServico(
    clinicId: string,
    novo: string | undefined,
  ) {
    const destino = normalizarAmbiente(novo);
    if (!destino) return;
    const config = await this.prisma.clinicFiscalConfig.findUnique({
      where: { clinicId },
    });
    const atual = normalizarAmbiente(config?.environment) ?? 'homologacao';
    if (destino === atual) return;

    if (!config?.nexosTenantId) {
      if (destino === 'producao') {
        throw new BadRequestException(
          'Envie o certificado e emita uma nota de homologação antes de passar para produção: ' +
            'a empresa é criada no serviço fiscal sempre em homologação.',
        );
      }
      return; // voltar para homologação sem empresa no serviço: só local
    }

    if (destino === 'producao') {
      const homologadas = await this.prisma.fiscalDocument.count({
        where: { clinicId, status: 'APPROVED', environment: 'homologacao' },
      });
      if (homologadas === 0) {
        throw new BadRequestException(
          'Antes de passar para produção, emita e tenha autorizada ao menos uma nota em homologação. ' +
            'Nada foi alterado.',
        );
      }
    }

    const { masterApiKey, apiUrl } = this.masterCreds();
    const corpo =
      destino === 'producao'
        ? { environment: 'producao', confirmarProducao: true }
        : { environment: 'homologacao' };
    try {
      await firstValueFrom(
        this.httpService.put(
          `${apiUrl}/tenants/${config.nexosTenantId}`,
          corpo,
          { headers: { 'X-API-Key': masterApiKey } },
        ),
      );
    } catch (e: any) {
      this.logger.error(
        `Troca de ambiente para ${destino} recusada pelo serviço — clinic ${clinicId}: ${this.errMsg(e)}`,
      );
      throw new BadRequestException(
        (e?.response
          ? 'O serviço fiscal recusou a troca de ambiente: '
          : 'O serviço fiscal não respondeu à troca de ambiente: ') +
          this.errMsg(e) +
          '. Nada foi alterado: a loja continua em ' +
          (atual === 'producao' ? 'produção.' : 'homologação.'),
      );
    }
    this.logger.warn(
      `Ambiente fiscal trocado para ${destino} no serviço — clinic ${clinicId}, tenant ${config.nexosTenantId}`,
    );
  }

  /**
   * A20: o ambiente de uma nota é o que o serviço gravou nela (GET /nfe/{id}), nunca a configuração
   * local. Falha na consulta devolve null: o webhook e a reconciliação preenchem depois.
   */
  private async ambienteDaNota(
    apiUrl: string,
    apiKey: string,
    documentId: string | undefined,
  ): Promise<'homologacao' | 'producao' | null> {
    if (!documentId) return null;
    try {
      const r = await firstValueFrom(
        this.httpService.get(`${apiUrl}/nfe/${documentId}`, {
          headers: { 'X-API-Key': apiKey },
        }),
      );
      return normalizarAmbiente(r.data?.environment ?? r.data?.Environment);
    } catch (e: any) {
      this.logger.warn(
        `Não foi possível ler o ambiente da nota ${documentId}: ${this.errMsg(e)}`,
      );
      return null;
    }
  }

  /**
   * A17: cadastra o webhook do ERP no serviço fiscal (POST /webhook com a chave do tenant), com a URL
   * pública de FISCAL_WEBHOOK_URL e o segredo de FISCAL_WEBHOOK_SECRET. Nunca lança: o resultado
   * (ok ou motivo da falha) fica gravado e volta para a tela.
   */
  async registrarWebhook(clinicId: string): Promise<{
    ok: boolean;
    skipped?: boolean;
    url?: string;
    message?: string;
  }> {
    const config = await this.prisma.clinicFiscalConfig.findUnique({
      where: { clinicId },
      select: { nexosTenantId: true, nexosApiKey: true },
    });
    if (!config?.nexosTenantId || !config.nexosApiKey) {
      return {
        ok: false,
        skipped: true,
        message:
          'A loja ainda não tem cadastro no serviço fiscal: envie o certificado primeiro.',
      };
    }

    const producao = process.env.NODE_ENV === 'production';
    const destino = validarUrlWebhook(
      this.configService.get<string>('FISCAL_WEBHOOK_URL'),
      producao,
    );
    const { segredo } = resolverSegredoWebhook();
    const apiUrl = this.configService.get<string>('FISCAL_MICROSERVICE_URL');
    const problema =
      destino.erro ??
      (!segredo
        ? 'FISCAL_WEBHOOK_SECRET não está configurado (ou é o valor de exemplo): o ERP recusaria os eventos.'
        : !apiUrl
          ? 'FISCAL_MICROSERVICE_URL não está configurada no servidor.'
          : null);
    if (problema) {
      return this.gravarResultadoWebhook(
        clinicId,
        destino.url ?? null,
        problema,
      );
    }

    try {
      await firstValueFrom(
        this.httpService.post(
          `${apiUrl}/webhook`,
          { url: destino.url, secret: segredo, eventType: 0 },
          { headers: { 'X-API-Key': config.nexosApiKey } },
        ),
      );
    } catch (e: any) {
      return this.gravarResultadoWebhook(
        clinicId,
        destino.url!,
        e?.response
          ? `O serviço fiscal recusou o cadastro do webhook: ${this.errMsg(e)}`
          : `O serviço fiscal não respondeu ao cadastro do webhook: ${this.errMsg(e)}`,
      );
    }
    this.logger.log(
      `Webhook do ERP cadastrado no serviço fiscal para a loja ${clinicId}: ${destino.url}`,
    );
    return this.gravarResultadoWebhook(clinicId, destino.url!, null);
  }

  private async gravarResultadoWebhook(
    clinicId: string,
    url: string | null,
    erro: string | null,
  ) {
    if (erro) {
      this.logger.warn(`Cadastro do webhook (loja ${clinicId}): ${erro}`);
    }
    await this.prisma.clinicFiscalConfig.update({
      where: { clinicId },
      data: erro
        ? { webhookError: erro }
        : {
            webhookUrl: url,
            webhookRegisteredAt: new Date(),
            webhookError: null,
          },
    });
    return erro
      ? { ok: false, ...(url ? { url } : {}), message: erro }
      : { ok: true, url: url! };
  }

  /** GET /webhook do serviço + o último resultado gravado, para a tela de configuração. */
  async consultarWebhook(clinicId: string) {
    const config = await this.prisma.clinicFiscalConfig.findUnique({
      where: { clinicId },
      select: {
        nexosTenantId: true,
        nexosApiKey: true,
        webhookUrl: true,
        webhookRegisteredAt: true,
        webhookError: true,
      },
    });
    const destino = validarUrlWebhook(
      this.configService.get<string>('FISCAL_WEBHOOK_URL'),
      process.env.NODE_ENV === 'production',
    );
    const base = {
      urlConfigurada: destino.url ?? null,
      problemaDeConfiguracao: destino.erro ?? null,
      ultimoCadastro: {
        url: config?.webhookUrl ?? null,
        em: config?.webhookRegisteredAt ?? null,
        erro: config?.webhookError ?? null,
      },
    };
    if (!config?.nexosTenantId || !config.nexosApiKey) {
      return { ...base, consultado: false, ativo: false, cadastrados: [] };
    }
    try {
      const apiUrl = this.configService.get<string>('FISCAL_MICROSERVICE_URL');
      const lista = (
        await firstValueFrom(
          this.httpService.get(`${apiUrl}/webhook`, {
            headers: { 'X-API-Key': config.nexosApiKey },
          }),
        )
      ).data;
      return {
        ...base,
        consultado: true,
        ativo: destino.url ? webhookDoErpAtivo(lista, destino.url) : false,
        cadastrados: Array.isArray(lista) ? lista : [],
      };
    } catch (e: any) {
      return {
        ...base,
        consultado: false,
        ativo: false,
        cadastrados: [],
        erroConsulta: `Não foi possível consultar o serviço fiscal: ${this.errMsg(e)}`,
      };
    }
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

    // Evento do certificado é da empresa, não de uma nota: não tem externalId
    if (event === 'CertificateExpiring') {
      return this.registrarAlertaCertificado(data);
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

  /** Webhook CertificateExpiring (A16): guarda a validade; o aviso é calculado ao mostrar. */
  private async registrarAlertaCertificado(data: any) {
    const evento = lerEventoCertificado(data);
    if (!evento) {
      this.logger.warn(
        'Webhook CertificateExpiring sem TenantId ou NotAfter válidos: ignorado',
      );
      return { status: 'IGNORED', message: 'Missing TenantId or NotAfter' };
    }
    // Reentrega atrasada do certificado antigo não pode apagar a validade de um mais novo
    const { count } = await this.prisma.clinicFiscalConfig.updateMany({
      where: {
        nexosTenantId: evento.tenantId,
        OR: [
          { certificateNotAfter: null },
          { certificateNotAfter: { lte: evento.notAfter } },
        ],
      },
      data: {
        certificateNotAfter: evento.notAfter,
        certificateAlertAt: new Date(),
      },
    });
    if (count === 0) {
      this.logger.warn(
        `Webhook CertificateExpiring ignorado para o tenant ${evento.tenantId}: tenant desconhecido ou validade mais nova já registrada`,
      );
      return {
        status: 'IGNORED',
        message: 'Unknown tenant or newer certificate',
      };
    }
    const alerta = avaliarAlertaCertificado(evento.notAfter);
    this.logger.warn(
      `Certificado do tenant ${evento.tenantId}: ${alerta?.mensagem ?? 'fora da faixa de aviso'}`,
    );
    return { status: 'SUCCESS' };
  }

  /** Aviso de vencimento do certificado da loja, para o banner do administrador. */
  async getCertificateAlert(clinicId: string) {
    const config = await this.prisma.clinicFiscalConfig.findUnique({
      where: { clinicId },
      select: { certificateNotAfter: true },
    });
    return { alerta: avaliarAlertaCertificado(config?.certificateNotAfter) };
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

  /**
   * "Tentar novamente" (A11): pede ao serviço fiscal nova tentativa de uma nota em AWAITING_SEFAZ
   * (SEFAZ fora do ar) ou FAILED (falha interna). É seguro: o serviço sempre consulta a SEFAZ antes
   * de reenviar, então não duplica a nota. Nota REJECTED pela SEFAZ não passa por aqui: exige nova
   * emissão com os dados corrigidos.
   */
  async tentarNovamente(fiscalDocumentId: string, clinicId: string) {
    const doc = await this.prisma.fiscalDocument.findFirst({
      where: { id: fiscalDocumentId, clinicId }, // escopo por loja
    });
    if (!doc) throw new NotFoundException('Documento fiscal não encontrado.');
    if (!doc.uuid) {
      throw new BadRequestException(
        'Documento fiscal ainda sem referência no serviço fiscal.',
      );
    }
    const bruto = (doc.remoteStatus ?? '').toUpperCase();
    if (bruto !== 'AWAITING_SEFAZ' && bruto !== 'FAILED') {
      throw new BadRequestException(
        'Só dá para tentar de novo uma nota aguardando a SEFAZ ou com falha de processamento. Nota rejeitada pela SEFAZ precisa ser emitida de novo com os dados corrigidos.',
      );
    }

    const { apiUrl, apiKey } = await this.resolveFiscalCreds(clinicId);
    try {
      await firstValueFrom(
        this.httpService.post(
          `${apiUrl}/nfe/${doc.uuid}/retry`,
          {},
          { headers: { 'X-API-Key': apiKey } },
        ),
      );
    } catch (error: any) {
      const status = error.response?.status;
      const msg = mensagemDoServico(error.response?.data);
      this.logger.warn(
        `Nova tentativa da nota ${doc.id} recusada pelo serviço fiscal: ${status || ''} ${msg || error.message}`,
      );
      if (status === 409) {
        throw new ConflictException(
          msg ||
            'O serviço fiscal não aceita nova tentativa neste momento (a nota não está aguardando a SEFAZ nem com falha).',
        );
      }
      throw new BadRequestException(
        msg ||
          'Não foi possível falar com o serviço fiscal. Tente de novo em instantes.',
      );
    }

    await this.prisma.fiscalDocument.update({
      where: { id: doc.id },
      data: {
        status: 'PROCESSING',
        errorMessage: null,
        remoteStatus: 'PROCESSING',
        statusDetail: 'Nova tentativa solicitada; aguardando o serviço fiscal.',
      },
    });
    return {
      status: 'PROCESSING',
      message:
        'Nova tentativa enviada. A nota será emitida automaticamente; a tela atualiza sozinha.',
    };
  }

  /**
   * Pede o cancelamento de uma NF-e autorizada (A3). O cancelamento NÃO é instantâneo: o serviço
   * responde 202 e a nota só vira CANCELLED quando a SEFAZ confirma (webhook NFeCanceled). Até lá a
   * nota segue APPROVED, marcada como "cancelamento em andamento"; se a SEFAZ recusar (EventRejected,
   * ex.: fora do prazo), volta ao normal e o motivo fica em `eventError`.
   */
  async cancelarNota(
    fiscalDocumentId: string,
    clinicId: string,
    justificativa: string,
  ) {
    const texto = (justificativa ?? '').trim();
    if (texto.length < 15 || texto.length > 255) {
      throw new BadRequestException(
        'A justificativa do cancelamento precisa ter de 15 a 255 caracteres.',
      );
    }

    const doc = await this.prisma.fiscalDocument.findFirst({
      where: { id: fiscalDocumentId, clinicId }, // escopo por loja
    });
    if (!doc) throw new NotFoundException('Documento fiscal não encontrado.');
    if (doc.status !== 'APPROVED') {
      throw new BadRequestException(
        'Só é possível cancelar uma nota autorizada pela SEFAZ.',
      );
    }
    if (!doc.uuid) {
      throw new BadRequestException(
        'Documento fiscal ainda sem referência no serviço fiscal.',
      );
    }
    if (doc.cancelRequestedAt) {
      throw new ConflictException(
        'Já existe um pedido de cancelamento em andamento para esta nota. Aguarde a resposta da SEFAZ.',
      );
    }

    const { apiUrl, apiKey } = await this.resolveFiscalCreds(clinicId);
    let eventId: string | undefined;
    try {
      const resp = await firstValueFrom(
        this.httpService.post(
          `${apiUrl}/nfe/${doc.uuid}/cancel`,
          { justificativa: texto },
          { headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' } },
        ),
      );
      eventId = resp.data?.eventId;
    } catch (error: any) {
      const status = error.response?.status;
      const msg = mensagemDoServico(error.response?.data);
      this.logger.warn(
        `Cancelamento da nota ${doc.id} recusado pelo serviço fiscal: ${status || ''} ${msg || error.message}`,
      );
      if (status === 409) {
        throw new ConflictException(
          msg ||
            'O serviço fiscal já tem um cancelamento pendente ou autorizado para esta nota.',
        );
      }
      if (status === 400 || status === 404) {
        throw new BadRequestException(
          msg || 'O serviço fiscal recusou o pedido de cancelamento.',
        );
      }
      throw new BadRequestException(
        'Não foi possível falar com o serviço fiscal para cancelar. Tente de novo em instantes.',
      );
    }

    await this.prisma.fiscalDocument.update({
      where: { id: doc.id },
      data: {
        cancelEventId: eventId ?? null,
        cancelRequestedAt: new Date(),
        cancelJustification: texto,
        eventError: null,
        eventErrorType: null,
      },
    });

    return {
      status: 'CANCELLING',
      eventId,
      message:
        'Pedido de cancelamento enviado. A nota só será cancelada quando a SEFAZ confirmar; acompanhe pelo status.',
    };
  }
}
