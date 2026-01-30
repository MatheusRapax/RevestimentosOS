import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateQuoteDto, CreateQuoteItemDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { QuoteStatus, OrderStatus, ReservationType } from '@prisma/client';

import { StockService } from '../stock/stock.service';

import { StockReservationsService } from '../stock-reservations/stock-reservations.service';

@Injectable()
export class QuotesService {
    constructor(
        private prisma: PrismaService,
        private stockService: StockService,
        private stockReservationsService: StockReservationsService,
    ) { }

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

        const deliveryFee = createQuoteDto.deliveryFeeCents || createQuoteDto.deliveryFee || 0;
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
                items: { select: { id: true, discountCents: true } },
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
                        reservations: true,
                    },
                },
            },
        });

        if (!quote) {
            throw new NotFoundException('Orçamento não encontrado');
        }

        return quote;
    }

    async checkAvailability(id: string, clinicId: string) {
        const quote = await this.findOne(id, clinicId);

        const itemsWithAvailability = await Promise.all(
            quote.items.map(async (item) => {
                // Get product stock info (uses the refactored logic with reservations)
                const productStock = await this.stockService.findOne(item.productId, clinicId);

                const required = item.quantityBoxes;
                const available = productStock.availableStock ?? 0;
                const missing = Math.max(0, required - available);

                let status: 'AVAILABLE' | 'PARTIAL' | 'NONE' = 'NONE';
                if (available >= required) {
                    status = 'AVAILABLE';
                } else if (available > 0) {
                    status = 'PARTIAL';
                }

                return {
                    itemId: item.id,
                    productId: item.productId,
                    productName: productStock.name,
                    sku: productStock.sku,
                    required,
                    available,
                    missing,
                    status,
                    lots: (productStock as any).lots // Useful for frontend to pick lots
                };
            })
        );

        // Summary status
        const allAvailable = itemsWithAvailability.every(i => i.status === 'AVAILABLE');
        const anyPartial = itemsWithAvailability.some(i => i.status === 'PARTIAL');
        const globalStatus = allAvailable ? 'FULL' : (anyPartial || itemsWithAvailability.some(i => i.status === 'AVAILABLE') ? 'PARTIAL' : 'NONE');

        return {
            quoteId: id,
            status: globalStatus,
            items: itemsWithAvailability
        };
    }

    async update(id: string, clinicId: string, updateQuoteDto: UpdateQuoteDto) {
        const quote = await this.findOne(id, clinicId);

        if (quote.status !== QuoteStatus.EM_ORCAMENTO) {
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

        if (quote.status !== QuoteStatus.EM_ORCAMENTO) {
            throw new BadRequestException('Apenas orçamentos em rascunho podem ser enviados');
        }

        return this.prisma.quote.update({
            where: { id },
            data: {
                status: QuoteStatus.AGUARDANDO_APROVACAO,
                sentAt: new Date(),
            },
        });
    }

    async approveQuote(id: string, clinicId: string) {
        const quote = await this.findOne(id, clinicId);

        if (quote.status !== QuoteStatus.AGUARDANDO_APROVACAO) {
            throw new BadRequestException('Apenas orçamentos enviados podem ser aprovados');
        }

        return this.prisma.quote.update({
            where: { id },
            data: {
                status: QuoteStatus.APROVADO,
                approvedAt: new Date(),
            },
        });
    }

    async convertToOrder(id: string, clinicId: string, sellerId: string) {
        const quote = await this.findOne(id, clinicId);

        if (quote.status !== QuoteStatus.APROVADO) {
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
                data: { status: QuoteStatus.CONVERTIDO },
            });

            // Cria o pedido
            const newOrder = await tx.order.create({
                data: {
                    clinicId,
                    number: nextOrderNumber,
                    quoteId: id,
                    customerId: quote.customerId,
                    sellerId,
                    status: OrderStatus.CRIADO,
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

            // TRANSFER RESERVATIONS: Quote -> Order
            // Update existing reservations to link to the new Order
            await tx.stockReservation.updateMany({
                where: {
                    quoteId: id,
                    status: 'ACTIVE'
                },
                data: {
                    orderId: newOrder.id,
                    type: ReservationType.PEDIDO
                }
            });

            return newOrder;
        });

        return order;
    }

    async reserveStock(id: string, clinicId: string) {
        const quote = await this.findOne(id, clinicId);

        if (quote.status !== QuoteStatus.EM_ORCAMENTO && quote.status !== QuoteStatus.AGUARDANDO_APROVACAO) {
            throw new BadRequestException('Apenas orçamentos em Rascunho ou Enviados podem ter estoque reservado');
        }

        // Check availability first
        const availability = await this.checkAvailability(id, clinicId);

        // Find existing reservations for this quote
        const existingReservations = await this.stockReservationsService.findByQuote(clinicId, id);

        const results = [];

        for (const item of quote.items) {
            // Check what is already reserved for this specific item
            const itemReservations = existingReservations.filter((r: any) => r.quoteItemId === item.id);
            const alreadyReserved = itemReservations.reduce((sum: number, r: any) => sum + r.quantity, 0);

            let remainingToReserve = item.quantityBoxes - alreadyReserved;

            if (remainingToReserve <= 0) {
                results.push({
                    itemId: item.id,
                    reserved: alreadyReserved,
                    requested: item.quantityBoxes,
                    message: 'Already fully reserved'
                });
                continue;
            }

            const productStock = await this.stockService.findOne(item.productId, clinicId);
            const lots = (productStock as any).lots || [];

            if (item.preferredLotId) {
                const manualLot = lots.find((l: any) => l.id === item.preferredLotId);
                if (manualLot) {
                    const lotReserved = manualLot.reservations?.reduce((sum: number, r: any) => sum + r.quantity, 0) || 0;
                    const available = manualLot.quantity - lotReserved;
                    const toTake = Math.min(available, remainingToReserve);

                    if (toTake > 0) {
                        await this.stockReservationsService.create(clinicId, {
                            quoteId: id,
                            quoteItemId: item.id,
                            lotId: manualLot.id,
                            quantity: toTake,
                        });
                        remainingToReserve -= toTake;
                    }
                }
            }

            if (remainingToReserve > 0 && !item.preferredLotId) {
                // Greedy
                lots.sort((a: any, b: any) => {
                    const availA = a.quantity - (a.reservations?.reduce((sum: number, r: any) => sum + r.quantity, 0) || 0);
                    const availB = b.quantity - (b.reservations?.reduce((sum: number, r: any) => sum + r.quantity, 0) || 0);
                    return availB - availA;
                });

                for (const lot of lots) {
                    if (remainingToReserve <= 0) break;

                    const reserved = lot.reservations?.reduce((sum: number, r: any) => sum + r.quantity, 0) || 0;
                    const available = lot.quantity - reserved;

                    if (available > 0) {
                        const toTake = Math.min(available, remainingToReserve);
                        await this.stockReservationsService.create(clinicId, {
                            quoteId: id,
                            quoteItemId: item.id,
                            lotId: lot.id,
                            quantity: toTake,
                        });
                        remainingToReserve -= toTake;
                    }
                }
            }

            results.push({
                itemId: item.id,
                reserved: item.quantityBoxes - remainingToReserve,
                requested: item.quantityBoxes,
                newlyReserved: (item.quantityBoxes - alreadyReserved) - remainingToReserve
            });
        }

        return { message: 'Reserva processada', results };
    }

    async deleteQuote(id: string, clinicId: string) {
        const quote = await this.findOne(id, clinicId);

        if (quote.status !== QuoteStatus.EM_ORCAMENTO) {
            throw new BadRequestException('Apenas orçamentos em rascunho podem ser excluídos');
        }

        return this.prisma.quote.delete({
            where: { id },
        });
    }

    // ========== ITEM MANAGEMENT ==========

    private async recalculateQuoteTotals(quoteId: string) {
        const quote = await this.prisma.quote.findUnique({
            where: { id: quoteId },
            include: { items: true },
        });

        if (!quote) return;

        const subtotalCents = quote.items.reduce((sum, item) => sum + item.totalCents, 0);
        let discountCents = quote.discountCents;

        // Re-apply percent discount if it exists
        if (quote.discountPercent && quote.discountPercent > 0) {
            discountCents = Math.round(subtotalCents * (quote.discountPercent / 100));
        }

        // Integrity check: Header discount cents cannot be > subtotal (unless negative total allowed? No)
        // If fixed discount was used, it stays constant, but cap it at subtotal
        if (!quote.discountPercent) {
            discountCents = Math.min(discountCents, subtotalCents);
        }

        const totalCents = Math.max(0, subtotalCents - discountCents + quote.deliveryFee);

        await this.prisma.quote.update({
            where: { id: quoteId },
            data: {
                subtotalCents,
                discountCents,
                totalCents,
            },
        });
    }

    async addItem(id: string, clinicId: string, dto: CreateQuoteItemDto) {
        const quote = await this.findOne(id, clinicId);

        if (quote.status !== QuoteStatus.EM_ORCAMENTO) {
            throw new BadRequestException('Apenas orçamentos em rascunho podem receber novos itens');
        }

        const processedItem = await this.processQuoteItem(clinicId, dto);

        await this.prisma.quote.update({
            where: { id },
            data: {
                items: {
                    create: {
                        ...processedItem,
                        // Ensure optional nulls are handled
                        preferredLotId: processedItem.preferredLotId ?? undefined,
                        notes: processedItem.notes ?? undefined,
                    }
                }
            }
        });

        await this.recalculateQuoteTotals(id);

        return this.findOne(id, clinicId);
    }

    async removeItem(id: string, itemId: string, clinicId: string) {
        const quote = await this.findOne(id, clinicId);

        if (quote.status !== QuoteStatus.EM_ORCAMENTO) {
            throw new BadRequestException('Apenas orçamentos em rascunho podem ter itens removidos');
        }

        const item = quote.items.find(i => i.id === itemId);
        if (!item) {
            throw new NotFoundException('Item não encontrado');
        }

        // SYNC: Cancel linked reservations
        await this.prisma.stockReservation.updateMany({
            where: {
                quoteItemId: itemId,
                status: 'ACTIVE'
            },
            data: {
                status: 'CANCELLED'
            }
        });

        // Delete item
        await this.prisma.quoteItem.delete({
            where: { id: itemId }
        });

        await this.recalculateQuoteTotals(id);

        return this.findOne(id, clinicId);
    }

    async updateItem(id: string, itemId: string, clinicId: string, dto: import('./dto/update-quote-item.dto').UpdateQuoteItemDto) {
        const quote = await this.findOne(id, clinicId);

        if (quote.status !== QuoteStatus.EM_ORCAMENTO) {
            throw new BadRequestException('Apenas orçamentos em rascunho podem ter itens editados');
        }

        const currentItem = quote.items.find(i => i.id === itemId);
        if (!currentItem) {
            throw new NotFoundException('Item não encontrado');
        }

        // Merge DTO with current values to re-process (need product info etc)
        // We need to re-fetch product to be safe inside processQuoteItem? 
        // processQuoteItem expects CreateQuoteItemDto which has specific shape.
        // Let's reconstruct the input for processQuoteItem
        const inputForCalc: CreateQuoteItemDto = {
            productId: currentItem.productId,
            inputArea: dto.inputArea ?? currentItem.inputArea ?? undefined,
            quantityBoxes: dto.quantityBoxes ?? currentItem.quantityBoxes,
            unitPriceCents: dto.unitPriceCents ?? currentItem.unitPriceCents,
            discountCents: dto.discountCents ?? currentItem.discountCents,
            discountPercent: dto.discountPercent ?? currentItem.discountPercent ?? undefined,
            preferredLotId: dto.preferredLotId ?? currentItem.preferredLotId ?? undefined,
            notes: dto.notes ?? currentItem.notes ?? undefined,
        };

        const processed = await this.processQuoteItem(clinicId, inputForCalc);

        // SYNC RESERVATIONS
        // If quantity decreased, we might need to release some reserved stock
        if (processed.quantityBoxes < currentItem.quantityBoxes) {
            const activeReservations = await this.prisma.stockReservation.findMany({
                where: { quoteItemId: itemId, status: 'ACTIVE' },
                orderBy: { quantity: 'asc' } // Release smaller chunks first or irrelevant?
            });

            const currentlyReserved = activeReservations.reduce((sum, r) => sum + r.quantity, 0);

            // Our target is to have AT MOST processed.quantityBoxes reserved
            // (We don't want to hold 10 boxes if user now only wants 5)
            if (currentlyReserved > processed.quantityBoxes) {
                let toRelease = currentlyReserved - processed.quantityBoxes;

                for (const res of activeReservations) {
                    if (toRelease <= 0) break;

                    const canRelease = Math.min(res.quantity, toRelease);

                    if (canRelease === res.quantity) {
                        // Cancel entire reservation
                        await this.prisma.stockReservation.update({
                            where: { id: res.id },
                            data: { status: 'CANCELLED' }
                        });
                    } else {
                        // Reduce quantity
                        await this.prisma.stockReservation.update({
                            where: { id: res.id },
                            data: { quantity: res.quantity - canRelease }
                        });
                    }

                    toRelease -= canRelease;
                }
            }
        }

        // Update Quote Item
        await this.prisma.quoteItem.update({
            where: { id: itemId },
            data: {
                inputArea: processed.inputArea,
                quantityBoxes: processed.quantityBoxes,
                resultingArea: processed.resultingArea,
                unitPriceCents: processed.unitPriceCents,
                discountCents: processed.discountCents,
                discountPercent: inputForCalc.discountPercent, // Note: processed object doesn't have discountPercent but we use input
                totalCents: processed.totalCents,
                preferredLotId: processed.preferredLotId,
                notes: processed.notes,
            }
        });

        await this.recalculateQuoteTotals(id);

        return this.findOne(id, clinicId);
    }
}
