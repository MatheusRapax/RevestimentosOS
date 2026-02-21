import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AddStockDto } from './dto/add-stock.dto';
import { RemoveStockDto } from './dto/remove-stock.dto';
import { StockMovementType, AuditAction, Prisma } from '@prisma/client';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ListStockMovementsDto } from './dto/list-stock-movements.dto';


@Injectable()
export class StockService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
    ) { }

    // ========== PRODUCT MANAGEMENT ==========

    async createProduct(clinicId: string, dto: CreateProductDto) {
        const product = await this.prisma.product.create({
            data: {
                clinicId,
                name: dto.name,
                description: dto.description,
                unit: dto.unit,
                sku: dto.sku,
                barcode: dto.barcode,
                minStock: dto.minStock || 0,
                boxCoverage: dto.boxCoverage,
                costCents: dto.costCents,
                priceCents: dto.priceCents,
                supplierCode: dto.supplierCode,
                categoryId: dto.categoryId,
                brandId: dto.brandId,
                markup: dto.markup,
                manualPrice: dto.manualPrice,
            },
        });

        // Audit log
        await this.auditService.log({
            clinicId,
            action: AuditAction.CREATE,
            entity: 'Product',
            entityId: product.id,
            message: 'stock.product.created',
        });

        return product;
    }

    async listProducts(clinicId: string, filters?: { search?: string; isActive?: boolean }) {
        console.log(`[StockService] listProducts called with clinicId=${clinicId}, filters=${JSON.stringify(filters)}`);
        const where: any = { clinicId };

        // Default to showing only active products
        if (filters?.isActive !== undefined) {
            where.isActive = filters.isActive;
        } else {
            where.isActive = true; // Default: show only active
        }

        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { sku: { contains: filters.search, mode: 'insensitive' } },
                { barcode: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        const products = await this.prisma.product.findMany({
            where,
            include: {
                lots: {
                    where: { quantity: { gt: 0 } },
                    include: { reservations: { where: { status: 'ACTIVE' } } },
                    orderBy: { expirationDate: 'asc' },
                },
                category: true,
                brand: true,
            },
            orderBy: { name: 'asc' },
        });

        // Fetch Global Markup
        const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: { globalMarkup: true },
        });

        const globalMarkup = clinic?.globalMarkup || 40.0;

        // Calculate total stock for each product
        const productsWithStock = products.map((product) => {
            const totalStock = product.lots.reduce((sum, lot) => sum + lot.quantity, 0);
            const totalReserved = product.lots.reduce((sum, lot) => {
                return sum + lot.reservations.reduce((rSum: number, r: any) => rSum + r.quantity, 0);
            }, 0);

            // Dynamic Price Calculation (Fallback)
            let displayPriceCents = product.priceCents;
            if ((!displayPriceCents || displayPriceCents === 0) && product.costCents) {
                let markup = globalMarkup;

                if (product.markup) {
                    markup = product.markup;
                } else if (product.brand?.defaultMarkup) {
                    markup = product.brand.defaultMarkup;
                } else if (product.category?.defaultMarkup) {
                    markup = product.category.defaultMarkup;
                }

                const cost = product.costCents;
                const price = cost * (1 + markup / 100);
                displayPriceCents = Math.round(price);
            }

            return {
                ...product,
                priceCents: displayPriceCents,
                totalStock,
                totalReserved,
                availableStock: totalStock - totalReserved,
            };
        });

        return productsWithStock;
    }

    async findOne(id: string, clinicId: string) {
        const [product, clinic] = await Promise.all([
            this.prisma.product.findFirst({
                where: { id, clinicId },
                include: {
                    lots: {
                        where: { quantity: { gt: 0 } },
                        include: {
                            reservations: {
                                where: { status: 'ACTIVE' },
                                include: {
                                    quote: { select: { number: true, customer: { select: { name: true } } } },
                                    order: { select: { number: true, customer: { select: { name: true } } } },
                                }
                            }
                        },
                        orderBy: { expirationDate: 'asc' },
                    },
                    category: true,
                    brand: true,
                },
            }),
            this.prisma.clinic.findUnique({
                where: { id: clinicId },
                select: { globalMarkup: true },
            }),
        ]);

        if (!product) {
            throw new NotFoundException('Produto não encontrado');
        }

        const totalStock = product.lots.reduce((sum, lot) => sum + lot.quantity, 0);
        const totalReserved = product.lots.reduce((sum, lot) => {
            return sum + lot.reservations.reduce((rSum: number, r: any) => rSum + r.quantity, 0);
        }, 0);

        // Dynamic Price Calculation if not manually set or missing
        let displayPriceCents = product.priceCents;

        if ((!displayPriceCents || displayPriceCents === 0) && product.costCents) {
            let markup = clinic?.globalMarkup || 40.0; // Default or Global

            if (product.markup) {
                markup = product.markup;
            } else if (product.brand?.defaultMarkup) {
                markup = product.brand.defaultMarkup;
            } else if (product.category?.defaultMarkup) {
                markup = product.category.defaultMarkup;
            }

            const cost = product.costCents;
            const price = cost * (1 + markup / 100);
            displayPriceCents = Math.round(price);
        }

        return {
            ...product,
            priceCents: displayPriceCents,
            totalStock,
            totalReserved,
            availableStock: totalStock - totalReserved,
        };
    }

    async updateProduct(id: string, clinicId: string, dto: UpdateProductDto) {
        const product = await this.prisma.product.findFirst({
            where: { id, clinicId },
        });

        if (!product) {
            throw new NotFoundException('Produto não encontrado');
        }

        return this.prisma.product.update({
            where: { id },
            data: dto,
        });
    }

    async softDeleteProduct(id: string, clinicId: string) {
        const product = await this.prisma.product.findFirst({
            where: { id, clinicId },
        });

        if (!product) {
            throw new NotFoundException('Produto não encontrado');
        }

        const deleted = await this.prisma.product.update({
            where: { id },
            data: { isActive: false },
        });

        // Audit log with product name
        await this.auditService.log({
            clinicId,
            action: AuditAction.DELETE,
            entity: 'Product',
            entityId: id,
            message: `stock.product.deleted: ${product.name}`,
        });

        return deleted;
    }

    // ========== STOCK OPERATIONS ==========

    async addStock(clinicId: string, dto: AddStockDto) {
        // Validate product exists
        const product = await this.prisma.product.findFirst({
            where: { id: dto.productId, clinicId },
        });

        if (!product) {
            throw new NotFoundException('Produto não encontrado');
        }

        // Validate expiration date is in the future (if provided)
        let expirationDate: Date | null = null;
        if (dto.expirationDate) {
            expirationDate = new Date(dto.expirationDate);
            if (expirationDate <= new Date()) {
                throw new BadRequestException('Data de validade deve ser futura');
            }
        }

        // Create lot and movement in a transaction
        const result = await this.prisma.$transaction(async (tx) => {
            // Create lot
            const lot = await tx.stockLot.create({
                data: {
                    clinicId,
                    productId: dto.productId,
                    lotNumber: dto.lotNumber,
                    quantity: dto.quantity,
                    expirationDate: expirationDate as any, // Cast to satisfy Prisma types (allows null)
                },
            });

            // Create IN movement
            await tx.stockMovement.create({
                data: {
                    clinicId,
                    productId: dto.productId,
                    lotId: lot.id,
                    type: StockMovementType.IN,
                    quantity: dto.quantity,
                    reason: `Entrada de estoque - Lote ${dto.lotNumber}`,
                    invoiceNumber: dto.invoiceNumber,
                    supplier: dto.supplier,
                },
            });

            return lot;
        });

        // Audit log
        await this.auditService.log({
            clinicId,
            action: AuditAction.CREATE,
            entity: 'StockMovement',
            entityId: result.id,
            message: 'stock.movement.created',
        });

        return result;
    }

    async removeStock(clinicId: string, dto: RemoveStockDto) {
        // Validate product exists
        const product = await this.prisma.product.findFirst({
            where: { id: dto.productId, clinicId },
        });

        if (!product) {
            throw new NotFoundException('Produto não encontrado');
        }

        // FIFO: Get lots ordered by expiration date (oldest first)
        const lots = await this.prisma.stockLot.findMany({
            where: {
                productId: dto.productId,
                clinicId,
                quantity: { gt: 0 },
            },
            orderBy: { expirationDate: 'asc' },
        });

        // Calculate total available stock
        const totalStock = lots.reduce((sum, lot) => sum + lot.quantity, 0);

        if (totalStock < dto.quantity) {
            throw new BadRequestException(
                `Estoque insuficiente. Disponível: ${totalStock}, Solicitado: ${dto.quantity}`,
            );
        }

        // Deduct stock using FIFO in a transaction
        await this.prisma.$transaction(async (tx) => {
            let remaining = dto.quantity;

            for (const lot of lots) {
                if (remaining <= 0) break;

                const deductAmount = Math.min(lot.quantity, remaining);

                // Update lot quantity
                await tx.stockLot.update({
                    where: { id: lot.id },
                    data: { quantity: lot.quantity - deductAmount },
                });

                // CONSUME RESERVATIONS (New Logic)
                // If orderId is provided, we must consume linked reservations to avoid "double counting"
                // (active reservation + physical removal = double deduction of availability)
                if (dto.orderId) {
                    const reservations = await tx.stockReservation.findMany({
                        where: {
                            orderId: dto.orderId,
                            lotId: lot.id,
                            status: 'ACTIVE',
                        },
                        orderBy: { quantity: 'asc' },
                    });

                    let amountToConsume = deductAmount;
                    for (const res of reservations) {
                        if (amountToConsume <= 0) break;

                        const consumed = Math.min(res.quantity, amountToConsume);
                        const newResQty = res.quantity - consumed;

                        if (newResQty <= 0) {
                            await tx.stockReservation.update({
                                where: { id: res.id },
                                data: { status: 'CONSUMED', quantity: 0 },
                            });
                        } else {
                            await tx.stockReservation.update({
                                where: { id: res.id },
                                data: { quantity: newResQty },
                            });
                        }
                        amountToConsume -= consumed;
                    }
                }

                // Create OUT movement
                await tx.stockMovement.create({
                    data: {
                        clinicId,
                        productId: dto.productId,
                        lotId: lot.id,
                        type: StockMovementType.OUT,
                        quantity: deductAmount,
                        reason: dto.reason || 'Saída manual de estoque',
                        destinationType: dto.destinationType,
                        destinationName: dto.destinationName,
                        encounterId: dto.encounterId,
                        orderId: dto.orderId,
                    },
                });

                remaining -= deductAmount;
            }
        });

        return { message: 'Estoque removido com sucesso', quantity: dto.quantity };
    }

    async adjustStock(clinicId: string, dto: AdjustStockDto) {
        // Validate product exists
        const product = await this.prisma.product.findFirst({
            where: { id: dto.productId, clinicId },
        });

        if (!product) {
            throw new NotFoundException('Produto não encontrado');
        }

        // Prepare movement data
        const movementData: Prisma.StockMovementCreateManyInput = {
            clinicId,
            productId: dto.productId,
            type: StockMovementType.ADJUST,
            quantity: Math.abs(dto.quantity), // Always positive in movement, distinct by type logic or sign?
            // Actually, StockMovement usually tracks *absolute* quantity moved.
            // But if it's an ADJUST, does it mean "set to X" or "delta X"?
            // Plan said DELTA.
            // If delta is negative, we remove. If positive, we add.
            // We should stick to the 'quantity' field being positive and 'type' indicating context, 
            // BUT 'StockMovementType' only has IN, OUT, ADJUST. 
            // So we need to imply direction. 
            // Usually IN/OUT are explicit. ADJUST is ambiguous.
            // Let's assume ADJUST movements with POSITIVE quantity mean ADD, 
            // and we might need a flag or just assume based on context?
            // Wait, existing types are IN, OUT, ADJUST.
            // If I subtract 5, is it OUT or ADJUST?
            // It uses stockMovement.quantity (Float).
            // Let's treat current 'quantity' as absolute value in movement record.
            // And maybe we need to know if it added or removed.
            // If we use ADUST, we lose "direction" unless we look at the lot change or have a 'sign' field.
            // Current schema doesn't have 'sign'.
            // Let's use IN/OUT for adjustments too? 
            // No, the enum has ADJUST.
            // Let's implicitly say: if reasons starts with "Ajuste (+)" or "Ajuste (-)"? Hacky.
            // Or maybe we treat negative quantity in DB? 
            // Prisma Float supports negative. 
            // Let's store negative quantity for removal in ADJUST type?
            // "quantity Float"
            reason: dto.reason,
        };

        // If lotId provided, simple update
        if (dto.lotId) {
            const lot = await this.prisma.stockLot.findFirst({
                where: { id: dto.lotId, clinicId },
            });

            if (!lot) throw new NotFoundException('Lote não encontrado');

            const newQuantity = lot.quantity + dto.quantity;
            if (newQuantity < 0) {
                throw new BadRequestException('Estoque do lote não pode ficar negativo');
            }

            // Update lot
            await this.prisma.stockLot.update({
                where: { id: lot.id },
                data: { quantity: newQuantity },
            });

            // Create movement
            await this.prisma.stockMovement.create({
                data: {
                    ...movementData,
                    lotId: lot.id,
                    quantity: dto.quantity, // Allow negative for clear direction in ADJUST
                },
            });
        } else {
            // No lot provided
            if (dto.quantity < 0) {
                // Remove using FIFO logic (similar to removeStock but type=ADJUST)
                await this.prisma.$transaction(async (tx) => {
                    const lots = await tx.stockLot.findMany({
                        where: { productId: dto.productId, clinicId, quantity: { gt: 0 } },
                        orderBy: { expirationDate: 'asc' },
                    });

                    let remainingToRemove = Math.abs(dto.quantity);
                    const totalAvailable = lots.reduce((acc, l) => acc + l.quantity, 0);

                    if (totalAvailable < remainingToRemove) {
                        throw new BadRequestException('Estoque insuficiente para ajuste negativo');
                    }

                    for (const lot of lots) {
                        if (remainingToRemove <= 0) break;
                        const deduct = Math.min(lot.quantity, remainingToRemove);

                        await tx.stockLot.update({
                            where: { id: lot.id },
                            data: { quantity: lot.quantity - deduct },
                        });

                        await tx.stockMovement.create({
                            data: {
                                clinicId,
                                productId: dto.productId,
                                lotId: lot.id,
                                type: StockMovementType.ADJUST,
                                quantity: -deduct, // Negative to indicate removal
                                reason: dto.reason,
                            },
                        });

                        remainingToRemove -= deduct;
                    }
                });
            } else {
                // Positive adjustment without lot
                // We must target a lot. Auto-select latest expiring? Or most recent?
                // Let's error for safety.
                throw new BadRequestException(
                    'Para ajustes positivos (entrada), é necessário especificar o lote ou usar a função de Entrada de Estoque.',
                );
            }
        }

        // Audit
        await this.auditService.log({
            clinicId,
            action: AuditAction.UPDATE,
            entity: 'Stock',
            entityId: dto.productId,
            message: `stock.adjust: ${dto.quantity} (${dto.reason})`,
        });

        return { success: true };
    }

    async listMovements(clinicId: string, dto: ListStockMovementsDto) {
        const { page = 1, limit = 20, productId, type, startDate, endDate } = dto;
        const skip = (page - 1) * limit;

        const where: Prisma.StockMovementWhereInput = {
            clinicId,
        };

        if (productId) where.productId = productId;
        if (type) where.type = type;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = startDate;
            if (endDate) where.createdAt.lte = endDate;
        }

        const [total, movements] = await Promise.all([
            this.prisma.stockMovement.count({ where }),
            this.prisma.stockMovement.findMany({
                where,
                include: {
                    product: { select: { name: true, unit: true } },
                    lot: { select: { lotNumber: true } },
                    // Include IDs for linking
                    stockEntry: { select: { id: true, invoiceNumber: true } },
                    stockExit: { select: { id: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
        ]);

        return {
            data: movements,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getProductStock(productId: string, clinicId: string) {
        const lots = await this.prisma.stockLot.findMany({
            where: {
                productId,
                clinicId,
                quantity: { gt: 0 },
            },
            orderBy: { expirationDate: 'asc' },
        });

        const totalStock = lots.reduce((sum, lot) => sum + lot.quantity, 0);

        return {
            productId,
            totalStock,
            lots,
        };
    }

    // ========== ALERTS ==========

    async getLowStockAlerts(clinicId: string) {
        const products = await this.prisma.product.findMany({
            where: {
                clinicId,
                isActive: true,
            },
            include: {
                lots: {
                    where: { quantity: { gt: 0 } },
                },
            },
        });

        const lowStockProducts = products
            .map((product) => ({
                ...product,
                totalStock: product.lots.reduce((sum, lot) => sum + lot.quantity, 0),
            }))
            .filter((product) => product.totalStock < product.minStock);

        return lowStockProducts;
    }

    async getExpiringLots(clinicId: string, days: number = 30) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        const expiringLots = await this.prisma.stockLot.findMany({
            where: {
                clinicId,
                quantity: { gt: 0 },
                expirationDate: {
                    lte: futureDate,
                },
            },
            include: {
                product: true,
            },
            orderBy: { expirationDate: 'asc' },
        });

        return expiringLots;
    }

    // ========== HELPER METHODS ==========

    async findProductByName(name: string, clinicId: string) {
        return this.prisma.product.findFirst({
            where: {
                name: { equals: name, mode: 'insensitive' },
                clinicId,
                isActive: true,
            },
        });
    }

    // ========== BULK OPERATIONS ==========

    async bulkImportProducts(clinicId: string, products: any[]) {
        // ... (existing implementation placeholder logic)
        return this.importParsedProducts(clinicId, products);
    }

    /**
     * Bulk Import Parsed Products (Actual Implementation)
     */
    async importParsedProducts(clinicId: string, items: any[], supplierId?: string) {
        // Sanitize supplierId
        const validSupplierId = supplierId && supplierId.trim() !== '' ? supplierId : undefined;

        let count = 0;
        const savedItems: any[] = [];

        await this.prisma.$transaction(async (tx) => {
            for (const item of items) {
                const existing = await tx.product.findFirst({
                    where: { clinicId, sku: item.sku }
                });

                let product;
                if (existing) {
                    product = await tx.product.update({
                        where: { id: existing.id },
                        data: {
                            name: item.name,
                            costCents: item.costCents,
                            supplierId: validSupplierId || existing.supplierId,
                            format: item.format,
                            line: item.line,
                            usage: item.usage,
                            supplierCode: item.supplierCode,
                            boxCoverage: item.boxCoverage,
                            piecesPerBox: item.piecesPerBox,
                            palletBoxes: item.palletBoxes,
                            boxWeight: item.boxWeight,
                        }
                    });
                } else {
                    product = await tx.product.create({
                        data: {
                            clinicId,
                            name: item.name,
                            sku: item.sku,
                            supplierId: validSupplierId,
                            costCents: item.costCents,
                            format: item.format,
                            line: item.line,
                            usage: item.usage,
                            supplierCode: item.supplierCode,
                            boxCoverage: item.boxCoverage,
                            piecesPerBox: item.piecesPerBox,
                            palletBoxes: item.palletBoxes,
                            boxWeight: item.boxWeight,
                            saleType: 'BOTH',
                        }
                    });
                }
                savedItems.push(product);
                count++;
            }
        });

        // Audit log
        await this.auditService.log({
            clinicId,
            action: AuditAction.CREATE,
            entity: 'Product',
            entityId: 'import-parsed',
            message: `stock.import: ${count} items processed`,
        });

        return { count, items: savedItems };
    }


    // ========== SHADE/CALIBER ALERTS ==========

    async getShadeCaliberAlerts(clinicId: string) {
        // Find products with multiple shades/calibers in stock
        const products = await this.prisma.product.findMany({
            where: { clinicId, isActive: true },
            include: {
                lots: {
                    where: { quantity: { gt: 0 } },
                    select: { shade: true, caliber: true, quantity: true, lotNumber: true },
                },
            },
        });

        const alerts: Array<{
            productId: string;
            productName: string;
            type: 'multiple_shades' | 'multiple_calibers';
            values: string[];
            message: string;
        }> = [];

        for (const product of products) {
            const lotsWithShade = product.lots.filter(l => l.shade);
            const lotsWithCaliber = product.lots.filter(l => l.caliber);

            // Check for multiple shades
            const uniqueShades = [...new Set(lotsWithShade.map(l => l.shade))].filter(Boolean);
            if (uniqueShades.length > 1) {
                alerts.push({
                    productId: product.id,
                    productName: product.name,
                    type: 'multiple_shades',
                    values: uniqueShades as string[],
                    message: `Produto com ${uniqueShades.length} tonalidades diferentes em estoque: ${uniqueShades.join(', ')}. Cuidado ao separar pedidos!`,
                });
            }

            // Check for multiple calibers
            const uniqueCalibers = [...new Set(lotsWithCaliber.map(l => l.caliber))].filter(Boolean);
            if (uniqueCalibers.length > 1) {
                alerts.push({
                    productId: product.id,
                    productName: product.name,
                    type: 'multiple_calibers',
                    values: uniqueCalibers as string[],
                    message: `Produto com ${uniqueCalibers.length} calibres diferentes em estoque: ${uniqueCalibers.join(', ')}. Não misturar na mesma obra!`,
                });
            }
        }

        return alerts;
    }
}
