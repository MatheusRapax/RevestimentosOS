import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateStockEntryDto } from './dto/create-stock-entry.dto';
import { AddStockEntryItemDto } from './dto/add-stock-entry-item.dto';
import { UpdateStockEntryDto } from './dto/update-stock-entry.dto';
import { EntryStatus, StockMovementType, EntryType } from '@prisma/client';

@Injectable()
export class StockEntryService {
    constructor(private prisma: PrismaService) { }

    async createDraft(clinicId: string, dto: CreateStockEntryDto, userId?: string) {
        let existingEntry = null;

        // 1. Check for duplicate by Access Key (Primary)
        if (dto.accessKey) {
            existingEntry = await this.prisma.stockEntry.findUnique({
                where: { accessKey: dto.accessKey }
            });
        }

        // 2. Fallback: Check for Invoice + Series + Supplier
        if (!existingEntry && dto.invoiceNumber && dto.supplierId) {
            existingEntry = await this.prisma.stockEntry.findFirst({
                where: {
                    clinicId,
                    invoiceNumber: dto.invoiceNumber,
                    series: dto.series,
                    supplierId: dto.supplierId
                }
            });
        }

        // 3. Handle Duplicate / Update Logic
        if (existingEntry) {
            if (existingEntry.clinicId !== clinicId) {
                throw new BadRequestException('Esta nota fiscal já foi importada em outra clínica.');
            }
            if (existingEntry.status !== EntryStatus.DRAFT) {
                throw new BadRequestException(`Nota fiscal já importada e com status: ${existingEntry.status === 'CONFIRMED' ? 'CONFIRMADA' : existingEntry.status}. Verifique o histórico.`);
            }

            // Update the existing draft so new/corrected XML data is applied
            // (Re-using the update logic structure)
            return this.prisma.stockEntry.update({
                where: { id: existingEntry.id },
                data: {
                    invoiceNumber: dto.invoiceNumber,
                    series: dto.series,
                    supplierId: dto.supplierId,
                    supplierName: dto.supplierName,
                    emissionDate: dto.emissionDate ? new Date(dto.emissionDate) : null,
                    arrivalDate: dto.arrivalDate ? new Date(dto.arrivalDate) : new Date(),
                    notes: dto.notes,

                    // --- Fiscal Data ---
                    accessKey: dto.accessKey, // Ensure accessKey is updated if it was missing 
                    operationNature: dto.operationNature,
                    protocol: dto.protocol,
                    model: dto.model,

                    // --- Totals ---
                    calculationBaseICMS: dto.calculationBaseICMS,
                    valueICMS: dto.valueICMS,
                    calculationBaseICMSST: dto.calculationBaseICMSST,
                    valueICMSST: dto.valueICMSST,
                    totalProductsValueCents: dto.totalProductsValueCents,
                    freightValueCents: dto.freightValueCents,
                    insuranceValueCents: dto.insuranceValueCents,
                    discountValueCents: dto.discountValueCents,
                    otherExpensesValueCents: dto.otherExpensesValueCents,
                    totalIPIValueCents: dto.totalIPIValueCents,

                    // --- Transport ---
                    freightType: dto.freightType,
                    carrierName: dto.carrierName,
                    carrierDocument: dto.carrierDocument,
                    carrierPlate: dto.carrierPlate,
                    carrierState: dto.carrierState,

                    // --- Volumes ---
                    volumeQuantity: dto.volumeQuantity,
                    volumeSpecies: dto.volumeSpecies,
                    grossWeight: dto.grossWeight,
                    netWeight: dto.netWeight,
                }
            });
        }

        // 4. Create New Entry if no duplicate found
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

                // --- Fiscal Data ---
                accessKey: dto.accessKey,
                operationNature: dto.operationNature,
                protocol: dto.protocol,
                model: dto.model,

                // --- Totals ---
                calculationBaseICMS: dto.calculationBaseICMS,
                valueICMS: dto.valueICMS,
                calculationBaseICMSST: dto.calculationBaseICMSST,
                valueICMSST: dto.valueICMSST,
                totalProductsValueCents: dto.totalProductsValueCents,
                freightValueCents: dto.freightValueCents,
                insuranceValueCents: dto.insuranceValueCents,
                discountValueCents: dto.discountValueCents,
                otherExpensesValueCents: dto.otherExpensesValueCents,
                totalIPIValueCents: dto.totalIPIValueCents,

                // --- Transport ---
                freightType: dto.freightType,
                carrierName: dto.carrierName,
                carrierDocument: dto.carrierDocument,
                carrierPlate: dto.carrierPlate,
                carrierState: dto.carrierState,

                // --- Volumes ---
                volumeQuantity: dto.volumeQuantity,
                volumeSpecies: dto.volumeSpecies,
                grossWeight: dto.grossWeight,
                netWeight: dto.netWeight,
            },
        });
    }

    async createFromPurchaseOrder(clinicId: string, purchaseOrderId: string, userId?: string) {
        // 1. Fetch Purchase Order
        const po = await this.prisma.purchaseOrder.findUnique({
            where: { id: purchaseOrderId, clinicId },
            include: { items: true }
        });

        if (!po) throw new NotFoundException('Pedido de Compra não encontrado');

        // Optional: Check status (e.g., must be SENT)
        // if (po.status !== 'SENT') throw new BadRequestException('Pedido precisa estar Enviado');

        // 2. Create Stock Entry Draft
        const entry = await this.prisma.stockEntry.create({
            data: {
                clinicId,
                status: EntryStatus.DRAFT,
                type: EntryType.INVOICE,
                supplierId: po.supplierId,
                supplierName: po.supplierName,
                arrivalDate: new Date(),
                notes: `Importado do Pedido de Compra #${po.number}`,
            }
        });

        // 3. Import Items
        if (po.items && po.items.length > 0) {
            const validItems = po.items.filter(i => i.productId);
            await this.prisma.stockEntryItem.createMany({
                data: validItems.map(poItem => ({
                    stockEntryId: entry.id,
                    productId: poItem.productId!,
                    quantity: poItem.quantityOrdered, // Import ordered quantity
                    unitCost: poItem.unitPriceCents, // Cost = PO Price
                    totalCost: poItem.totalCents,
                    // Lot/Expiry left empty for user to fill
                }))
            });

            // Update total
            await this.prisma.stockEntry.update({
                where: { id: entry.id },
                data: { totalValue: po.totalCents }
            });
        }

        return this.getEntry(clinicId, entry.id);
    }

    async update(clinicId: string, entryId: string, dto: UpdateStockEntryDto) {
        const entry = await this.prisma.stockEntry.findUnique({ where: { id: entryId, clinicId } });
        if (!entry) throw new NotFoundException('Entrada não encontrada');
        if (entry.status !== EntryStatus.DRAFT) throw new BadRequestException('Apenas rascunhos podem ser editados');

        return this.prisma.stockEntry.update({
            where: { id: entryId },
            data: {
                invoiceNumber: dto.invoiceNumber,
                series: dto.series,
                supplierId: dto.supplierId,
                supplierName: dto.supplierName,
                emissionDate: dto.emissionDate ? new Date(dto.emissionDate) : undefined,
                arrivalDate: dto.arrivalDate ? new Date(dto.arrivalDate) : undefined,
                notes: dto.notes,

                // --- Fiscal Data ---
                accessKey: dto.accessKey,
                operationNature: dto.operationNature,
                protocol: dto.protocol,
                model: dto.model,

                // --- Totals ---
                calculationBaseICMS: dto.calculationBaseICMS,
                valueICMS: dto.valueICMS,
                calculationBaseICMSST: dto.calculationBaseICMSST,
                valueICMSST: dto.valueICMSST,
                totalProductsValueCents: dto.totalProductsValueCents,
                freightValueCents: dto.freightValueCents,
                insuranceValueCents: dto.insuranceValueCents,
                discountValueCents: dto.discountValueCents,
                otherExpensesValueCents: dto.otherExpensesValueCents,
                totalIPIValueCents: dto.totalIPIValueCents,

                // --- Transport ---
                freightType: dto.freightType,
                carrierName: dto.carrierName,
                carrierDocument: dto.carrierDocument,
                carrierPlate: dto.carrierPlate,
                carrierState: dto.carrierState,

                // --- Volumes ---
                volumeQuantity: dto.volumeQuantity,
                volumeSpecies: dto.volumeSpecies,
                grossWeight: dto.grossWeight,
                netWeight: dto.netWeight,
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

                // --- Fiscal Data ---
                ncm: dto.ncm,
                cfop: dto.cfop,
                cst: dto.cst,
                discountValueCents: dto.discountValueCents,
                freightValueCents: dto.freightValueCents,
                insuranceValueCents: dto.insuranceValueCents,
                valueICMS: dto.valueICMS,
                rateICMS: dto.rateICMS,
                valueIPI: dto.valueIPI,
                rateIPI: dto.rateIPI,
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

    async listEntries(clinicId: string, page = 1, limit = 20, status?: string) {
        const skip = (page - 1) * limit;
        const where: any = { clinicId };

        if (status) {
            where.status = status;
        }

        const [data, total] = await this.prisma.$transaction([
            this.prisma.stockEntry.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: { _count: { select: { items: true } } }
            }),
            this.prisma.stockEntry.count({ where }),
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
        if (entry.items.length === 0) throw new BadRequestException('A entrada não possui itens. Adicione produtos antes de confirmar.');

        // Mandatory Fields Validation
        if (!entry.invoiceNumber && entry.type === EntryType.INVOICE) throw new BadRequestException('Número da Nota Fiscal é obrigatório para confirmar.');
        if ((!entry.supplierId && !entry.supplierName) && entry.type === EntryType.INVOICE) throw new BadRequestException('Informe o Fornecedor para confirmar a entrada.');
        // if (!entry.arrivalDate) throw new BadRequestException('Data de Chegada é obrigatória para confirmar.'); // arrivalDate often defaults to now if missing, but let's be strict if user asked for it. 
        // Actually, createDraft defaults arrivalDate to new Date() if missing. So checks might pass always unless explicitly null.
        // Let's check anyway.
        if (!entry.arrivalDate) throw new BadRequestException('Informe a Data de Chegada para confirmar.');

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
                        stockEntryId: entry.id, // Link to entry document
                        batchId: entry.id, // Group items from same operation
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
        if (entry.status !== EntryStatus.DRAFT) throw new BadRequestException('Esta entrada já foi processada e não pode ser cancelada. Realize um ajuste de estoque se necessário.');

        return this.prisma.stockEntry.update({
            where: { id: entryId },
            data: { status: EntryStatus.CANCELED },
        });
    }

    async deleteEntry(clinicId: string, entryId: string) {
        const entry = await this.prisma.stockEntry.findUnique({ where: { id: entryId, clinicId } });
        if (!entry) throw new NotFoundException('Entrada não encontrada');
        if (entry.status !== EntryStatus.DRAFT) throw new BadRequestException('Não é possível excluir uma entrada já confirmada.');

        return this.prisma.stockEntry.delete({ where: { id: entryId } });
    }
}
