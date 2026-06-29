import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { UpdateFiscalSettingsDto } from '../dto/update-fiscal-settings.dto';
import FormData from 'form-data';

@Injectable()
export class FiscalService {
  private readonly logger = new Logger(FiscalService.name);

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async setupNexosFiscal(
    clinicId: string,
    name: string,
    document: string,
    pfxBuffer: Buffer,
    password: string,
    originalFileName: string,
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

    try {
      this.logger.log(`Starting NexosFiscal setup for clinic ${clinicId}`);

      // 1. Create Tenant
      const createTenantRes = await firstValueFrom(
        this.httpService.post(
          `${apiUrl}/tenants`,
          { name, document },
          {
            headers: { 'X-API-Key': masterApiKey },
          },
        ),
      );
      const tenantId = createTenantRes.data.id;

      this.logger.log(`Tenant created: ${tenantId}`);

      // 2. Generate API Key
      const createKeyRes = await firstValueFrom(
        this.httpService.post(
          `${apiUrl}/tenants/${tenantId}/api-keys`,
          {},
          {
            headers: { 'X-API-Key': masterApiKey },
          },
        ),
      );
      const apiKey = createKeyRes.data.key;

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

  async emitirNota(orderId: string, clinicId: string) {
    this.logger.log(
      `Initiating NF-e emission for Order ${orderId} in Clinic ${clinicId}`,
    );

    // 1. Fetch Fiscal Config with Fallback
    let config = await this.prisma.clinicFiscalConfig.findUnique({
      where: { clinicId },
    });

    if (!config) {
      // Transient config from Env Vars
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

    if (!apiKey) {
      throw new BadRequestException(
        'Configuração da API Key Fiscal (nexosApiKey ou FISCAL_API_KEY) não encontrada. Configure no painel ou no .env.',
      );
    }

    // 2. Fetch Order
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        delivery: true,
      },
    });

    if (!order) {
      throw new BadRequestException('Pedido não encontrado');
    }

    const blockedStatuses = [
      'CRIADO',
      'RASCUNHO',
      'AGUARDANDO_PAGAMENTO',
      'CANCELADO',
    ];
    if (blockedStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Não é possível emitir NFe para um pedido no status ${order.status}. O pedido deve estar confirmado/pago.`,
      );
    }
    if (!order.customer) throw new Error('Cliente não associado ao pedido.');
    if (!order.customer.document)
      throw new Error('CPF/CNPJ do cliente não cadastrado.');

    // 3. PreFlight Check: Fiscal Data Governance (Fast Input trigger)
    const itemsMissingFiscalData = order.items.filter(
      (item) => !item.product.ncm || !item.product.cfop || !item.product.cst,
    );

    if (itemsMissingFiscalData.length > 0) {
      throw new BadRequestException({
        message:
          'Existem produtos sem dados fiscais (NCM, CFOP ou CST). A emissão foi bloqueada.',
        code: 'MISSING_FISCAL_DATA',
        products: itemsMissingFiscalData.map((i) => ({
          id: i.product.id,
          name: i.product.name,
        })),
      });
    }

    // 4. Prepare Payload
    const baseUrl =
      this.configService.get('APP_URL') || 'https://api.revestimentos.com.br';

    // Fallbacks for address mapping
    const [logradouro, numero] = (order.customer.address || '')
      .split(',')
      .map((s) => s.trim());

    const payload = {
      externalId: order.id,
      naturezaOperacao:
        config?.defaultNaturezaOperacao || 'Venda de mercadorias',
      finalidade: 'NORMAL',
      destinatario: {
        tipo: order.customer.document.length > 11 ? 'PJ' : 'PF',
        cnpjCpf: order.customer.document,
        razaoSocial: order.customer.name,
        endereco: {
          logradouro:
            logradouro || order.customer.address || 'Rua não informada',
          numero: numero || 'S/N',
          bairro: order.customer.neighborhood || 'Centro',
          codigoMunicipio: '3550308', // Default until IBGE codes are added to Customer model
          municipio: order.customer.city || 'São Paulo',
          uf: order.customer.state || 'SP',
          cep: order.customer.zipCode || '01001000',
        },
      },
      itens: order.items.map((item) => {
        const isM2 = item.product.unit?.toUpperCase() === 'M2';
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

    // 4. Send Request
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

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Falha na comunicação com a API Fiscal.';

      if (errorDoc) {
        await this.prisma.fiscalDocument.update({
          where: { id: errorDoc.id },
          data: {
            status: 'REJECTED',
            errorMessage: errorMessage,
          },
        });
      } else {
        await this.prisma.fiscalDocument.create({
          data: {
            clinicId,
            orderId,
            status: 'REJECTED',
            type: 'NFE',
            errorMessage: errorMessage,
          },
        });
      }

      throw new BadRequestException(errorMessage);
    }
  }

  async getSettings(clinicId: string) {
    const config = await this.prisma.clinicFiscalConfig.findUnique({
      where: { clinicId },
    });

    const hasEnvCredentials = !!process.env.FISCAL_MASTER_API_KEY;

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
}
