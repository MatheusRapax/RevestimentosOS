import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateQuoteDto, CreateQuoteItemDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { QuoteStatus } from '@prisma/client';

@Injectable()
export class QuotesService {
    constructor(private prisma: PrismaService) { }

    /**
     * Calcula a quantidade de caixas necessárias para cobrir uma área.
     * Arredonda PARA CIMA (ceil) pois caixas são vendidas inteiras.
     */
    calculateBoxesFromArea(areaSqm: number, boxCoverage: number): number {
        if (boxCoverage <= 0) {
            throw new BadRequestException('Cobertura da caixa deve ser maior que zero');
        }
        return Math.ceil(areaSqm / boxCoverage);
    }

    /**
     * Processa um item do orçamento calculando quantidades e totais
     */
    async processQuoteItem(
        clinicId: string,
        item: CreateQuoteItemDto,
    ): Promise<{
        productId: string;
        inputArea: number | null;
        quantityBoxes: number;
        resultingArea: number | null;
        unitPriceCents: number;
        discountCents: number;
        totalCents: number;
        preferredLotId: string | null;
        notes: string | null;
    }> {
        // Busca o produto para obter boxCoverage
        const product = await this.prisma.product.findFirst({
            where: { id: item.productId, clinicId },
        });

        if (!product) {
            throw new NotFoundException(`Produto ${item.productId} não encontrado`);
        }

        let quantityBoxes: number;
        let inputArea: number | null = null;
        let resultingArea: number | null = null;

        // Se informou área, calcula caixas
        if (item.inputArea && item.inputArea > 0) {
            if (!product.boxCoverage || product.boxCoverage <= 0) {
                throw new BadRequestException(
                    `Produto ${product.name} não possui cobertura por caixa configurada`,
                );
            }
            inputArea = item.inputArea;
            quantityBoxes = this.calculateBoxesFromArea(inputArea, product.boxCoverage);
            resultingArea = quantityBoxes * product.boxCoverage;
        } else if (item.quantityBoxes && item.quantityBoxes > 0) {
            // Usou quantidade de caixas diretamente
            quantityBoxes = item.quantityBoxes;
            if (product.boxCoverage && product.boxCoverage > 0) {
                resultingArea = quantityBoxes * product.boxCoverage;
            }
        } else {
            throw new BadRequestException(
                'Informe inputArea (m²) ou quantityBoxes para cada item',
            );
        }

        // Calcula desconto
        let discountCents = item.discountCents || 0;
        if (item.discountPercent && item.discountPercent > 0) {
            const subtotal = quantityBoxes * item.unitPriceCents;
            discountCents = Math.round(subtotal * (item.discountPercent / 100));
        }

        // Total do item
        const totalCents = (quantityBoxes * item.unitPriceCents) - discountCents;

        return {
            productId: item.productId,
            inputArea,
            quantityBoxes,
            resultingArea,
            unitPriceCents: item.unitPriceCents,
            discountCents,
            totalCents: Math.max(0, totalCents),
            preferredLotId: item.preferredLotId || null,
            notes: item.notes || null,
        };
    }

    async create(clinicId: string, sellerId: string, createQuoteDto: CreateQuoteDto) {
        // Gera número sequencial do orçamento
        const lastQuote = await this.prisma.quote.findFirst({
            where: { clinicId },
            orderBy: { number: 'desc' },
            select: { number: true },
        });
        const nextNumber = (lastQuote?.number || 0) + 1;

        // Processa todos os items
        const processedItems = await Promise.all(
            createQuoteDto.items.map((item) => this.processQuoteItem(clinicId, item)),
        );

        // Calcula subtotal
        const subtotalCents = processedItems.reduce((sum, item) => sum + item.totalCents, 0);

        // Calcula desconto global
        let discountCents = createQuoteDto.discountCents || 0;
        if (createQuoteDto.discountPercent && createQuoteDto.discountPercent > 0) {
            discountCents = Math.round(subtotalCents * (createQuoteDto.discountPercent / 100));
        }

        const deliveryFee = createQuoteDto.deliveryFee || 0;
        const totalCents = Math.max(0, subtotalCents - discountCents + deliveryFee);

        // Cria orçamento com items
        const quote = await this.prisma.quote.create({
            data: {
                clinicId,
                number: nextNumber,
                customerId: createQuoteDto.customerId,
                architectId: createQuoteDto.architectId,
                sellerId,
                validUntil: createQuoteDto.validUntil ? new Date(createQuoteDto.validUntil) : null,
                subtotalCents,
                discountCents,
                discountPercent: createQuoteDto.discountPercent,
                deliveryFee,
                totalCents,
                notes: createQuoteDto.notes,
                internalNotes: createQuoteDto.internalNotes,
                items: {
                    create: processedItems,
                },
            },
            include: {
                customer: { select: { id: true, name: true, document: true } },
                architect: { select: { id: true, name: true } },
                seller: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true, boxCoverage: true } },
                    },
                },
            },
        });

        return quote;
    }

    async findAll(clinicId: string, status?: QuoteStatus) {
        const where: any = { clinicId };
        if (status) {
            where.status = status;
        }

        return this.prisma.quote.findMany({
            where,
            include: {
                customer: { select: { id: true, name: true } },
                architect: { select: { id: true, name: true } },
                seller: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string, clinicId: string) {
        const quote = await this.prisma.quote.findFirst({
            where: { id, clinicId },
            include: {
                customer: true,
                architect: true,
                seller: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, sku: true, boxCoverage: true, unit: true } },
                        preferredLot: { select: { id: true, lotNumber: true, shade: true, caliber: true } },
                    },
                },
            },
        });

        if (!quote) {
            throw new NotFoundException('Orçamento não encontrado');
        }

        return quote;
    }

    async update(id: string, clinicId: string, updateQuoteDto: UpdateQuoteDto) {
        const quote = await this.findOne(id, clinicId);

        if (quote.status !== 'DRAFT') {
            throw new BadRequestException('Apenas orçamentos em rascunho podem ser editados');
        }

        return this.prisma.quote.update({
            where: { id },
            data: {
                ...updateQuoteDto,
                validUntil: updateQuoteDto.validUntil ? new Date(updateQuoteDto.validUntil) : undefined,
            },
            include: {
                customer: { select: { id: true, name: true } },
                items: true,
            },
        });
    }

    async sendQuote(id: string, clinicId: string) {
        const quote = await this.findOne(id, clinicId);

        if (quote.status !== 'DRAFT') {
            throw new BadRequestException('Apenas orçamentos em rascunho podem ser enviados');
        }

        return this.prisma.quote.update({
            where: { id },
            data: {
                status: 'SENT',
                sentAt: new Date(),
            },
        });
    }

    async approveQuote(id: string, clinicId: string) {
        const quote = await this.findOne(id, clinicId);

        if (quote.status !== 'SENT') {
            throw new BadRequestException('Apenas orçamentos enviados podem ser aprovados');
        }

        return this.prisma.quote.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedAt: new Date(),
            },
        });
    }

    async convertToOrder(id: string, clinicId: string, sellerId: string) {
        const quote = await this.findOne(id, clinicId);

        if (quote.status !== 'APPROVED') {
            throw new BadRequestException('Apenas orçamentos aprovados podem ser convertidos em pedido');
        }

        // Gera número do pedido
        const lastOrder = await this.prisma.order.findFirst({
            where: { clinicId },
            orderBy: { number: 'desc' },
            select: { number: true },
        });
        const nextOrderNumber = (lastOrder?.number || 0) + 1;

        // Cria o pedido baseado no orçamento
        const order = await this.prisma.$transaction(async (tx) => {
            // Atualiza status do orçamento
            await tx.quote.update({
                where: { id },
                data: { status: 'CONVERTED' },
            });

            // Cria o pedido
            const newOrder = await tx.order.create({
                data: {
                    clinicId,
                    number: nextOrderNumber,
                    quoteId: id,
                    customerId: quote.customerId,
                    sellerId,
                    subtotalCents: quote.subtotalCents,
                    discountCents: quote.discountCents,
                    deliveryFee: quote.deliveryFee,
                    totalCents: quote.totalCents,
                    notes: quote.notes,
                    items: {
                        create: quote.items.map((item) => ({
                            productId: item.productId,
                            inputArea: item.inputArea,
                            quantityBoxes: item.quantityBoxes,
                            resultingArea: item.resultingArea,
                            unitPriceCents: item.unitPriceCents,
                            discountCents: item.discountCents,
                            totalCents: item.totalCents,
                            lotId: item.preferredLotId,
                            notes: item.notes,
                        })),
                    },
                },
                include: {
                    customer: { select: { id: true, name: true } },
                    items: true,
                },
            });

            return newOrder;
        });

        return order;
    }

    async deleteQuote(id: string, clinicId: string) {
        const quote = await this.findOne(id, clinicId);

        if (quote.status !== 'DRAFT') {
            throw new BadRequestException('Apenas orçamentos em rascunho podem ser excluídos');
        }

        return this.prisma.quote.delete({
            where: { id },
        });
    }
}
