import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { UpdateFiscalSettingsDto } from '../dto/update-fiscal-settings.dto';

@Injectable()
export class FiscalService {
    private readonly logger = new Logger(FiscalService.name);

    constructor(
        private prisma: PrismaService,
        private httpService: HttpService,
        private configService: ConfigService,
    ) { }

    async emitirNota(orderId: string, clinicId: string) {
        this.logger.log(`Initiating NF-e emission for Order ${orderId} in Clinic ${clinicId}`);

        // 1. Fetch Fiscal Config with Fallback
        let config = await this.prisma.clinicFiscalConfig.findUnique({
            where: { clinicId },
        });

        if (!config) {
            // Transient config from Env Vars
            config = {
                clinicId,
                id: 'transient',
                consumerKey: process.env.WEBMANIA_CONSUMER_KEY || null,
                consumerSecret: process.env.WEBMANIA_CONSUMER_SECRET || null,
                accessToken: process.env.WEBMANIA_ACCESS_TOKEN || null,
                accessTokenSecret: process.env.WEBMANIA_ACCESS_TOKEN_SECRET || null,
                environment: process.env.WEBMANIA_ENV || '2',
                defaultNaturezaOperacao: 'Venda de mercadoria',
                defaultNcm: null,
                defaultCest: null,
                defaultTaxClass: null,
                defaultOrigin: 0,
            } as any;
        }

        const consumerKey = config?.consumerKey || process.env.WEBMANIA_CONSUMER_KEY;
        const consumerSecret = config?.consumerSecret || process.env.WEBMANIA_CONSUMER_SECRET;
        const accessToken = config?.accessToken || process.env.WEBMANIA_ACCESS_TOKEN;
        const accessTokenSecret = config?.accessTokenSecret || process.env.WEBMANIA_ACCESS_TOKEN_SECRET;

        if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
            throw new Error('Configurações fiscais (Webmania) incompletas na clínica ou variáveis de ambiente.');
        }

        // 2. Fetch Order
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                customer: true,
                items: {
                    include: {
                        product: true,
                    }
                },
                delivery: true,
            },
        });

        if (!order) throw new Error('Pedido não encontrado.');
        if (!order.customer) throw new Error('Cliente não associado ao pedido.');
        if (!order.customer.document) throw new Error('CPF/CNPJ do cliente não cadastrado.');

        // 3. Prepare Payload
        const baseUrl = this.configService.get('APP_URL') || 'https://api.revestimentos.com.br';
        const notificationUrl = `${baseUrl}/api/fiscal/webhook`;
        const isProduction = config?.environment === '1';

        const payload = {
            ID: order.id,
            url_notificacao: notificationUrl,
            operacao: 1, // Saída
            natureza_operacao: config?.defaultNaturezaOperacao || 'Venda de mercadoria',
            modelo: 1, // NF-e
            finalidade: 1, // Normal
            ambiente: isProduction ? 1 : 2,
            cliente: {
                cpf: order.customer.document.length === 11 ? order.customer.document : undefined,
                cnpj: order.customer.document.length > 11 ? order.customer.document : undefined,
                razao_social: order.customer.name,
                endereco: order.customer.address,
                cidade: order.customer.city,
                uf: order.customer.state,
                cep: order.customer.zipCode,
                telefone: order.customer.phone,
                email: order.customer.email,
            },
            produtos: order.items.map(item => ({
                nome: item.product.name,
                codigo: item.product.id.substring(0, 20),
                ncm: item.product.ncm || config?.defaultNcm || '00000000',
                cest: item.product.cest || config?.defaultCest,
                quantidade: item.quantityBoxes,
                unidade: item.product.unit || 'UN',
                peso: item.product.boxWeight ? (item.quantityBoxes * item.product.boxWeight).toFixed(3) : '0.000',
                origem: item.product.origin ?? config?.defaultOrigin ?? 0,
                subtotal: (item.totalCents / 100).toFixed(2),
                total: (item.totalCents / 100).toFixed(2),
                classe_imposto: item.product.taxClass || config?.defaultTaxClass,
            })),
            pedido: {
                pagamento: 0,
                forma_pagamento: 15, // Boleto default for now
                frete: order.deliveryFee ? (order.deliveryFee / 100).toFixed(2) : '0.00',
            }
        };

        // 4. Send Request
        const headers = {
            'X-Consumer-Key': consumerKey,
            'X-Consumer-Secret': consumerSecret,
            'X-Access-Token': accessToken,
            'X-Access-Token-Secret': accessTokenSecret,
            'Content-Type': 'application/json',
        };

        try {
            const url = 'https://webmania.me/api/1/nfe/emissao';
            const response = await firstValueFrom(
                this.httpService.post(url, payload, { headers })
            );
            const data = response.data as any;

            if (data.error) {
                throw new Error(`Webmania Error: ${data.error}`);
            }

            // 5. Save Record
            await this.prisma.fiscalDocument.create({
                data: {
                    clinicId,
                    orderId,
                    uuid: data.uuid,
                    status: data.status,
                    type: 'NFE',
                    xmlUrl: data.xml,
                    danfeUrl: data.danfe,
                    serie: data.serie,
                    number: data.nfe ? String(data.nfe) : null,
                    key: data.chave,
                },
            });

            return { status: 'SUCCESS', message: 'Nota Fiscal enviada para processamento.', uuid: data.uuid };

        } catch (error: any) {
            this.logger.error(`Error emitting NF-e: ${error.message}`, error.stack);

            // Log rejection
            await this.prisma.fiscalDocument.create({
                data: {
                    clinicId,
                    orderId,
                    status: 'REJECTED',
                    type: 'NFE',
                    errorMessage: error.response?.data?.error || error.message,
                }
            });

            throw error;
        }
    }

    async getSettings(clinicId: string) {
        const config = await this.prisma.clinicFiscalConfig.findUnique({
            where: { clinicId },
        });

        const hasEnvCredentials =
            !!process.env.WEBMANIA_CONSUMER_KEY &&
            !!process.env.WEBMANIA_CONSUMER_SECRET;

        if (!config) {
            return {
                hasCredentials: hasEnvCredentials,
                source: 'env',
                environment: process.env.WEBMANIA_ENV || '2',
                defaultNaturezaOperacao: 'Venda de mercadoria',
                defaultTaxClass: null,
                defaultNcm: null,
                defaultCest: null,
                defaultOrigin: 0,
            };
        }

        const hasDbCredentials =
            !!config.consumerKey && !!config.consumerSecret;

        return {
            hasCredentials: hasDbCredentials || hasEnvCredentials,
            source: hasDbCredentials ? 'database' : 'env',
            environment: config.environment,
            defaultNaturezaOperacao: config.defaultNaturezaOperacao,
            defaultTaxClass: config.defaultTaxClass,
            defaultNcm: config.defaultNcm,
            defaultCest: config.defaultCest,
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
        this.logger.log(`Received Webhook from Webmania: ${JSON.stringify(payload)}`);

        const { uuid, status, nfe, serie, chave, xml, danfe, log, motivo } = payload;

        if (!uuid) {
            this.logger.warn('Webhook payload missing UUID');
            return { status: 'IGNORED', message: 'Missing UUID' };
        }

        const fiscalDoc = await this.prisma.fiscalDocument.findUnique({
            where: { uuid },
        });

        if (!fiscalDoc) {
            this.logger.warn(`FiscalDocument not found for UUID: ${uuid}`);
            return { status: 'NOT_FOUND', message: 'FiscalDocument not found' };
        }

        let newStatus = fiscalDoc.status;
        let errorMessage = null;

        const statusLower = status?.toLowerCase();

        if (statusLower === 'aprovado') newStatus = 'APPROVED';
        else if (statusLower === 'rejeitado') newStatus = 'REJECTED';
        else if (statusLower === 'cancelado') newStatus = 'CANCELLED';
        else if (statusLower === 'processando') newStatus = 'PROCESSING';
        else if (statusLower === 'contingencia') newStatus = 'CONTINGENCY';

        if (newStatus === 'REJECTED') {
            errorMessage = log || motivo || 'Rejeição desconhecida';
        }

        await this.prisma.fiscalDocument.update({
            where: { uuid },
            data: {
                status: newStatus,
                number: nfe ? String(nfe) : fiscalDoc.number,
                serie: serie ? String(serie) : fiscalDoc.serie,
                key: chave || fiscalDoc.key,
                xmlUrl: xml || fiscalDoc.xmlUrl,
                danfeUrl: danfe || fiscalDoc.danfeUrl,
                errorMessage: errorMessage,
            },
        });

        this.logger.log(`Updated FiscalDocument ${uuid} to ${newStatus}`);
        return { status: 'SUCCESS' };
    }
}
