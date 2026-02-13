import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ExitStatus, StockMovementType, ExitType } from '@prisma/client';

export class CreateStockExitDto {
    type?: ExitType;
    destinationType?: string;
    destinationName?: string;
    notes?: string;
}

export class AddStockExitItemDto {
    productId: string;
    quantity: number;
    lotId?: string; // Optional specific lot
}

@Injectable()
export class StockExitService {
    constructor(private prisma: PrismaService) { }

    async createDraft(clinicId: string, dto: CreateStockExitDto, userId: string) {
        return this.prisma.stockExit.create({
            data: {
                clinicId,
                status: ExitStatus.DRAFT,
                type: dto.type || ExitType.SECTOR_REQUEST,
                destinationType: dto.destinationType,
                destinationName: dto.destinationName,
                requestedBy: userId, // Assuming ID or Name
                notes: dto.notes,
            },
        });
    }

    async createFromOrder(clinicId: string, orderId: string, userId: string) {
        // 1. Fetch Order with Items and Customer
        const order = await this.prisma.order.findUnique({
            where: { id: orderId, clinicId },
            include: {
                customer: true,
                items: {
                    include: { product: true }
                }
            }
        });

        if (!order) throw new NotFoundException('Pedido não encontrado');

        // 2. Fetch active reservations for this order
        const reservations = await this.prisma.stockReservation.findMany({
            where: { orderId: orderId, status: 'ACTIVE' },
            include: { lot: true }
        });

        // Map ProductId -> List of Reservations
        const reservationsByProduct = new Map<string, any[]>();
        reservations.forEach(r => {
            if (r.lot) {
                const prodId = r.lot.productId;
                if (!reservationsByProduct.has(prodId)) reservationsByProduct.set(prodId, []);
                reservationsByProduct.get(prodId)?.push(r);
            }
        });

        // 3. Create Exit Draft (Using PATIENT_USE as "Customer/External")
        const exit = await this.prisma.stockExit.create({
            data: {
                clinicId,
                status: ExitStatus.DRAFT,
                type: ExitType.SALE,
                destinationType: 'CUSTOMER',
                destinationName: `Pedido #${order.number} - ${order.customer?.name || 'Cliente'}`,
                requestedBy: userId,
                notes: `Gerado a partir do Pedido #${order.number}`,
            }
        });

        // 4. Create Items
        for (const orderItem of order.items) {
            const productReservations = reservationsByProduct.get(orderItem.productId) || [];

            // Consuming strategy: Take first available reservation logic (greedy)
            const reservation = productReservations.shift();

            // Determine quantity (Area OR Boxes)
            // If product is sold by area, resultingArea should be used.
            const quantity = orderItem.resultingArea || orderItem.quantityBoxes;

            await this.prisma.stockExitItem.create({
                data: {
                    stockExitId: exit.id,
                    productId: orderItem.productId,
                    quantity: Number(quantity),
                    lotId: reservation?.lotId || null,
                }
            });
        }

        return this.getExit(clinicId, exit.id);
    }

    async addItem(clinicId: string, exitId: string, dto: AddStockExitItemDto) {
        const exit = await this.prisma.stockExit.findUnique({
            where: { id: exitId, clinicId },
        });

        if (!exit || exit.status !== ExitStatus.DRAFT) throw new BadRequestException('Saída inválida');

        // Check stock availability (simple check)
        const product = await this.prisma.product.findUnique({
            where: { id: dto.productId },
            include: { lots: true }
        });

        const totalStock = product?.lots.reduce((acc, lot) => acc + lot.quantity, 0) || 0;
        if (totalStock < dto.quantity) throw new BadRequestException(`Estoque insuficiente. Disponível: ${totalStock}, Solicitado: ${dto.quantity}`);

        return this.prisma.stockExitItem.create({
            data: {
                stockExitId: exit.id,
                productId: dto.productId,
                quantity: dto.quantity,
                lotId: dto.lotId,
            },
        });
    }

    async removeItem(clinicId: string, exitId: string, itemId: string) {
        const exit = await this.prisma.stockExit.findUnique({ where: { id: exitId, clinicId } });
        if (!exit || exit.status !== ExitStatus.DRAFT) throw new BadRequestException('Ação inválida');
        await this.prisma.stockExitItem.delete({ where: { id: itemId } });
    }

    async getExit(clinicId: string, exitId: string) {
        const exit = await this.prisma.stockExit.findUnique({
            where: { id: exitId, clinicId },
            include: {
                items: {
                    include: { product: true, lot: true }
                }
            }
        });
        if (!exit) throw new NotFoundException('Saída não encontrada');
        return exit;
    }

    async listExits(clinicId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [data, total] = await this.prisma.$transaction([
            this.prisma.stockExit.findMany({
                where: { clinicId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: { _count: { select: { items: true } } }
            }),
            this.prisma.stockExit.count({ where: { clinicId } }),
        ]);

        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        };
    }

    // === CRITICAL: CONFIRM EXIT TRANSACTION ===
    async confirmExit(clinicId: string, exitId: string, userId: string) {
        const exit = await this.prisma.stockExit.findUnique({
            where: { id: exitId, clinicId },
            include: { items: true },
        });

        if (!exit) throw new NotFoundException('Saída não encontrada');
        if (exit.status !== ExitStatus.DRAFT) throw new BadRequestException('Esta saída já foi confirmada e não pode ser processada novamente.');
        if (exit.items.length === 0) throw new BadRequestException('A saída não possui itens. Adicione produtos antes de confirmar.');

        return this.prisma.$transaction(async (tx) => {
            // 1. Mark Exit as CONFIRMED
            const confirmedExit = await tx.stockExit.update({
                where: { id: exitId },
                data: {
                    status: ExitStatus.CONFIRMED,
                    confirmedAt: new Date(),
                    approvedBy: userId,
                },
            });

            // 2. Process each item (FIFO mostly)
            for (const item of exit.items) {
                let remainingQty = item.quantity;

                // Fetch candidate lots (FIF0: ordered by expirationDate ASC)
                // If item has specific lotId, strict filter.
                const whereLots = {
                    clinicId,
                    productId: item.productId,
                    quantity: { gt: 0 },
                    ...(item.lotId ? { id: item.lotId } : {})
                };

                const lots = await tx.stockLot.findMany({
                    where: whereLots,
                    orderBy: { expirationDate: 'asc' },
                });

                const totalAvailable = lots.reduce((acc, l) => acc + l.quantity, 0);
                if (totalAvailable < remainingQty) {
                    throw new BadRequestException(`Estoque insuficiente para o item (Lote/Produto).`);
                }

                // Deduct from lots
                for (const lot of lots) {
                    if (remainingQty <= 0) break;

                    const deduct = Math.min(lot.quantity, remainingQty);

                    await tx.stockLot.update({
                        where: { id: lot.id },
                        data: { quantity: { decrement: deduct } }
                    });

                    // Create Movement
                    await tx.stockMovement.create({
                        data: {
                            clinicId,
                            productId: item.productId,
                            type: StockMovementType.OUT,
                            quantity: deduct,
                            lotId: lot.id,
                            destinationType: exit.destinationType,
                            destinationName: exit.destinationName,
                            stockExitId: exit.id, // Link to exit document
                            reason: `Saída: ${exit.type} - Destino: ${exit.destinationName || 'N/A'}`,
                        }
                    });

                    remainingQty -= deduct;
                }
            }

            return confirmedExit;
        });
    }

    async cancelExit(clinicId: string, exitId: string) {
        const exit = await this.prisma.stockExit.findUnique({ where: { id: exitId, clinicId } });
        if (!exit || exit.status !== ExitStatus.DRAFT) throw new BadRequestException('Apenas rascunhos podem ser cancelados.');

        return this.prisma.stockExit.update({
            where: { id: exitId },
            data: { status: ExitStatus.REJECTED },
        });
    }
}
