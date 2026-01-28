import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateStockEntryDto } from './dto/create-stock-entry.dto';
import { AddStockEntryItemDto } from './dto/add-stock-entry-item.dto';
import { EntryStatus, StockMovementType, EntryType } from '@prisma/client';

@Injectable()
export class StockEntryService {
    constructor(private prisma: PrismaService) { }

    async createDraft(clinicId: string, dto: CreateStockEntryDto, userId?: string) {
        return this.prisma.stockEntry.create({
            data: {
                clinicId,
                status: EntryStatus.DRAFT,
                type: dto.type || EntryType.INVOICE,
                invoiceNumber: dto.invoiceNumber,
                series: dto.series,
                supplierId: dto.supplierId,
                supplierName: dto.supplierName,
                emissionDate: dto.emissionDate ? new Date(dto.emissionDate) : null,
                arrivalDate: dto.arrivalDate ? new Date(dto.arrivalDate) : new Date(),
                notes: dto.notes,
            },
        });
    }

    async addItem(clinicId: string, entryId: string, dto: AddStockEntryItemDto) {
        const entry = await this.prisma.stockEntry.findUnique({
            where: { id: entryId, clinicId },
        });

        if (!entry) throw new NotFoundException('Entrada não encontrada');
        if (entry.status !== EntryStatus.DRAFT) throw new BadRequestException('Entrada já confirmada ou cancelada');

        const item = await this.prisma.stockEntryItem.create({
            data: {
                stockEntryId: entry.id,
                productId: dto.productId,
                quantity: dto.quantity,
                unitCost: dto.unitCost,
                totalCost: dto.unitCost ? dto.quantity * dto.unitCost : null,
                lotNumber: dto.lotNumber,
                expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : null,
                manufacturer: dto.manufacturer,
            },
        });

        await this.updateEntryTotal(entryId);
        return item;
    }

    async removeItem(clinicId: string, entryId: string, itemId: string) {
        const entry = await this.prisma.stockEntry.findUnique({ where: { id: entryId, clinicId } });
        if (!entry || entry.status !== EntryStatus.DRAFT) throw new BadRequestException('Ação inválida');

        await this.prisma.stockEntryItem.delete({ where: { id: itemId } });
        await this.updateEntryTotal(entryId);
    }

    private async updateEntryTotal(entryId: string) {
        const items = await this.prisma.stockEntryItem.findMany({ where: { stockEntryId: entryId } });
        const total = items.reduce((sum, item) => sum + (item.totalCost || 0), 0);
        await this.prisma.stockEntry.update({
            where: { id: entryId },
            data: { totalValue: total },
        });
    }

    async getEntry(clinicId: string, entryId: string) {
        const entry = await this.prisma.stockEntry.findUnique({
            where: { id: entryId, clinicId },
            include: {
                items: {
                    include: { product: true }
                }
            }
        });
        if (!entry) throw new NotFoundException('Entrada não encontrada');
        return entry;
    }

    async listEntries(clinicId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [data, total] = await this.prisma.$transaction([
            this.prisma.stockEntry.findMany({
                where: { clinicId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: { _count: { select: { items: true } } }
            }),
            this.prisma.stockEntry.count({ where: { clinicId } }),
        ]);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        };
    }

    // === CRITICAL: CONFIRM ENTRY TRANSACTION ===
    async confirmEntry(clinicId: string, entryId: string, userId: string) {
        const entry = await this.prisma.stockEntry.findUnique({
            where: { id: entryId, clinicId },
            include: { items: true },
        });

        if (!entry) throw new NotFoundException('Entrada não encontrada');
        if (entry.status !== EntryStatus.DRAFT) throw new BadRequestException('Entrada não está em rascunho');
        if (entry.items.length === 0) throw new BadRequestException('Entrada vazia');

        // Start Transaction
        return this.prisma.$transaction(async (tx) => {
            // 1. Mark Entry as CONFIRMED
            const confirmedEntry = await tx.stockEntry.update({
                where: { id: entryId },
                data: {
                    status: EntryStatus.CONFIRMED,
                    confirmedAt: new Date(),
                    confirmedBy: userId,
                },
            });

            // 2. Process each item
            for (const item of entry.items) {
                let lotId = null;

                // 2a. Handle Lot (Create or Find)
                if (item.lotNumber && item.expirationDate) {
                    // Try to find existing lot for this product/number
                    const existingLot = await tx.stockLot.findFirst({
                        where: {
                            clinicId,
                            productId: item.productId,
                            lotNumber: item.lotNumber,
                        },
                    });

                    if (existingLot) {
                        // Update existing lot
                        await tx.stockLot.update({
                            where: { id: existingLot.id },
                            data: { quantity: { increment: item.quantity } },
                        });
                        lotId = existingLot.id;
                    } else {
                        // Create new lot
                        const newLot = await tx.stockLot.create({
                            data: {
                                clinicId,
                                productId: item.productId,
                                lotNumber: item.lotNumber,
                                expirationDate: item.expirationDate,
                                quantity: item.quantity,
                            },
                        });
                        lotId = newLot.id;
                    }
                }

                // 2b. Create Stock Movement (Ledger)
                await tx.stockMovement.create({
                    data: {
                        clinicId,
                        productId: item.productId,
                        type: StockMovementType.IN,
                        quantity: item.quantity,
                        lotId: lotId,
                        invoiceNumber: entry.invoiceNumber,
                        supplier: entry.supplierName,
                        batchId: entry.id, // Link movement to this Entry ID
                        reason: `Entrada: ${entry.type} #${entry.invoiceNumber || entry.id}`,
                    },
                });
            }

            return confirmedEntry;
        });
    }

    async cancelEntry(clinicId: string, entryId: string) {
        // Only if DRAFT
        const entry = await this.prisma.stockEntry.findUnique({ where: { id: entryId, clinicId } });
        if (!entry) throw new NotFoundException('Entrada não encontrada');
        if (entry.status !== EntryStatus.DRAFT) throw new BadRequestException('Apenas rascunhos podem ser cancelados. Para reverter, faça uma saída/ajuste.');

        return this.prisma.stockEntry.update({
            where: { id: entryId },
            data: { status: EntryStatus.CANCELED },
        });
    }
}
