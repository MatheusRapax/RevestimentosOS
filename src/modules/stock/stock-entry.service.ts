import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateStockEntryDto } from './dto/create-stock-entry.dto';
import { AddStockEntryItemDto } from './dto/add-stock-entry-item.dto';
import { UpdateStockEntryDto } from './dto/update-stock-entry.dto';
import { EntryStatus, StockMovementType, EntryType } from '@prisma/client';

import { StockAllocationService } from './services/stock-allocation.service';

@Injectable()
export class StockEntryService {
    constructor(
        private prisma: PrismaService,
        private stockAllocationService: StockAllocationService
    ) { }

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

    async createFromPurchaseOrder(clinicId: string, purchaseOrderId: string, userId?: string) {
        // 1. Fetch Purchase Order
        const po = await this.prisma.purchaseOrder.findUnique({
            where: { id: purchaseOrderId, clinicId },
            include: { items: true, supplier: true }
        });

        if (!po) throw new NotFoundException('Pedido de Compra não encontrado');
        if (['RECEIVED', 'CANCELLED'].includes(po.status)) throw new BadRequestException(`Este pedido já está com status ${po.status}`);

        // 2. Create Stock Entry Draft
        return this.prisma.stockEntry.create({
            data: {
                clinicId,
                status: EntryStatus.DRAFT,
                type: EntryType.INVOICE,
                purchaseOrderId: po.id, // Link to PO

                // Copy Supplier Info
                supplierId: po.supplierId,
                supplierName: po.supplierName,

                // Initialize with values
                totalProductsValueCents: po.subtotalCents,
                freightValueCents: po.shippingCents,
                totalValue: po.totalCents / 100, // Legacy float (consider removing eventually)

                // Copy Items
                // Copy Items
                items: {
                    create: po.items
                        .filter(item => item.productId) // Only items with Product ID
                        .map(item => ({
                            product: { connect: { id: item.productId! } },
                            productName: item.productName,
                            quantity: item.quantityOrdered, // Default to ordered quantity
                            unitCost: item.unitPriceCents, // Use unitCost field name
                            totalCost: item.totalCents, // Use totalCost field name
                        }))
                }
            }
        });
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
        const result = await this.prisma.$transaction(async (tx) => {
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

        // 3. Trigger Auto-Allocation for waiting orders (Outside Transaction)
        if (entry && entry.items) {
            // Collect unique product IDs from entry items
            const productIds = [...new Set(entry.items.map(i => i.productId))];

            // Fire and forget (or await but don't fail confirm based on allocation errors)
            try {
                await this.stockAllocationService.processStockArrival(clinicId, productIds, userId);
            } catch (error) {
                console.error('Failed to trigger processStockArrival:', error);
            }
        }

        // 4. Update linked Purchase Order status (Outside Transaction)
        if (entry.purchaseOrderId) {
            try {
                await this.prisma.purchaseOrder.update({
                    where: { id: entry.purchaseOrderId },
                    data: {
                        status: 'RECEIVED',
                        receivedAt: new Date(),
                    }
                });
            } catch (error) {
                console.error(`Failed to update PurchaseOrder ${entry.purchaseOrderId} status:`, error);
            }
        }

        return result;
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
