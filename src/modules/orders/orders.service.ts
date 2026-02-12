import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { FinanceService } from '../finance/finance.service';
import { OrderStatus, PurchaseOrderStatus } from '@prisma/client';

import { StockAllocationService } from '../stock/services/stock-allocation.service';
import { StockExitService } from '../stock/stock-exit.service';

@Injectable()
export class OrdersService {
    constructor(
        private prisma: PrismaService,
        private financeService: FinanceService,
        private stockAllocationService: StockAllocationService,
        private stockExitService: StockExitService,
    ) { }

    async findAll(clinicId: string, filters?: { status?: string; customerId?: string }) {
        const where: any = { clinicId };

        if (filters?.status && filters.status !== 'all') {
            where.status = filters.status;
        }

        if (filters?.customerId) {
            where.customerId = filters.customerId;
        }

        return this.prisma.order.findMany({
            where,
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                    },
                },
                seller: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                            },
                        },
                    },
                },
                delivery: {
                    select: {
                        id: true,
                        status: true,
                        scheduledDate: true,
                    },
                },
                stockReservations: {
                    include: {
                        lot: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(clinicId: string, id: string) {
        return this.prisma.order.findFirst({
            where: { id, clinicId },
            include: {
                customer: true,
                seller: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                items: {
                    include: {
                        product: true,
                        lot: true,
                        reservations: {
                            where: { status: 'ACTIVE' },
                            include: { lot: true },
                        },
                    },
                },
                quote: {
                    select: {
                        id: true,
                        number: true,
                    },
                },
                delivery: true,
                invoices: true,
                purchaseOrders: {
                    select: {
                        id: true,
                        number: true,
                        status: true,
                        expectedDate: true,
                        supplierName: true,
                    },
                },
            },
        });
    }

    async updateStatus(clinicId: string, id: string, status: OrderStatus, userId?: string) {
        const updateData: any = { status };

        if (status === OrderStatus.PAGO) {
            updateData.confirmedAt = new Date(); // Semantic mapping: PAGO = confirmed
        } else if (status === OrderStatus.ENTREGUE) {
            updateData.deliveredAt = new Date();
        }

        // Capture previous status before transaction
        const prevOrder = await this.prisma.order.findUnique({ where: { id } });
        if (!prevOrder) throw new Error('Pedido não encontrado');
        const previousStatus = prevOrder.status;

        // Validation for PRONTO_PARA_ENTREGA
        if (status === OrderStatus.PRONTO_PARA_ENTREGA) {
            if (previousStatus === OrderStatus.CRIADO) {
                throw new BadRequestException('Não é possível marcar como Pronto para Entrega um pedido em Rascunho. Confirme o pedido primeiro.');
            }
            if (previousStatus === OrderStatus.CANCELADO) {
                throw new BadRequestException('Não é possível reativar um pedido Cancelado diretamente para Pronto para Entrega.');
            }

            // Check for pending Purchase Orders
            const pendingPO = await this.prisma.purchaseOrder.findFirst({
                where: {
                    salesOrderId: id,
                    status: {
                        notIn: [PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED]
                    }
                }
            });

            if (pendingPO) {
                throw new BadRequestException(`Existe um Pedido de Compra (#${pendingPO.number}) vinculado pendente de recebimento completo.`);
            }
        }

        // Transaction to handle cancellations and finance integration
        let result;
        // Transaction to handle cancellations and finance integration
        try {
            result = await this.prisma.$transaction(async (tx) => {
                const currentOrder = await tx.order.findUnique({
                    where: { id },
                    include: { customer: true }
                });

                if (!currentOrder) throw new Error('Pedido não encontrado');

                // 1. Update Order Status
                const order = await tx.order.update({
                    where: { id },
                    data: updateData,
                });

                // 2. Cancellation Logic
                if (status === OrderStatus.CANCELADO) {
                    await tx.stockReservation.updateMany({
                        where: { orderId: id, status: 'ACTIVE' },
                        data: { status: 'CANCELLED' },
                    });
                }

                // 3. Finance Integration (Auto-Payment)
                if (status === OrderStatus.PAGO && currentOrder.status !== OrderStatus.PAGO) {
                    const desc = `Pagamento Pedido #${currentOrder.number}`;

                    if (currentOrder.totalCents > 0) {
                        await this.financeService.registerPayment(
                            clinicId,
                            null,
                            currentOrder.totalCents,
                            'CASH',
                            desc,
                            1,
                            userId,
                            currentOrder.customerId
                        );
                    }

                }

                return order;
            });
        } catch (error: any) {
            console.error('[OrdersService] Error updating order status:', error);
            throw new InternalServerErrorException(`Erro ao atualizar status: ${error.message || error}`);
        }

        // 4. Fulfillment Automation (Auto-Allocation) - MOVED OUTSIDE TRANSACTION
        if (status === OrderStatus.PAGO && previousStatus !== OrderStatus.PAGO) {
            try {
                // Run allocation asynchronously to not block response? No, we want to await but outside transaction.
                await this.stockAllocationService.autoAllocateOrder(clinicId, id, userId);
            } catch (error) {
                console.error('Failed to auto-allocate stock:', error);
                // Non-blocking error for UI flow
            }
        }

        // 5. Stock Exit Automation (Outside Transaction)
        // When order is marked ready for delivery, auto-create and confirm a stock exit
        if (status === OrderStatus.PRONTO_PARA_ENTREGA && previousStatus !== OrderStatus.PRONTO_PARA_ENTREGA) {
            try {
                const exitDraft = await this.stockExitService.createFromOrder(clinicId, id, userId!);
                await this.stockExitService.confirmExit(clinicId, exitDraft.id, userId!);
                console.log(`[Fulfillment] Auto stock exit created and confirmed for order ${id}`);
            } catch (error) {
                console.error(`[Fulfillment] Failed to auto-create stock exit for order ${id}:`, error);
            }
        }

        // 6. Finalization Automation (When Delivered)
        if (status === OrderStatus.ENTREGUE && previousStatus !== OrderStatus.ENTREGUE) {
            try {
                // 6a. Ensure Fulfillment Status is FULFILLED
                await this.prisma.order.update({
                    where: { id },
                    data: { fulfillmentStatus: 'DELIVERED' }
                });

                // 6b. Close linked Quote (if any)
                const orderWithQuote = await this.prisma.order.findUnique({
                    where: { id },
                    select: { quoteId: true }
                });

                if (orderWithQuote?.quoteId) {
                    await this.prisma.quote.updateMany({
                        where: { id: orderWithQuote.quoteId, status: { not: 'CONVERTIDO' } }, // Use correct enum value
                        data: { status: 'CONVERTIDO' }
                    });
                }

                // 6c. Close linked Purchase Orders (if strictly linked)
                await this.prisma.purchaseOrder.updateMany({
                    where: {
                        salesOrderId: id,
                        status: { in: ['SENT', 'CONFIRMED', 'PARTIAL'] }
                    },
                    data: { status: 'RECEIVED', receivedAt: new Date() }
                });

            } catch (error) {
                console.error('Failed to auto-finalize linked documents:', error);
            }
        }

        return result;
    }

    async updateDeliveryInfo(clinicId: string, id: string, data: { deliveryAddress?: string; deliveryDate?: string }) {
        return this.prisma.order.update({
            where: { id },
            data: {
                deliveryAddress: data.deliveryAddress,
                deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
            },
        });
    }

    async getStats(clinicId: string) {
        const [pending, awaitingStock, ready, delivered, cancelled] = await Promise.all([
            this.prisma.order.count({ where: { clinicId, status: OrderStatus.CRIADO } }),
            this.prisma.order.count({ where: { clinicId, status: OrderStatus.AGUARDANDO_MATERIAL } }),
            this.prisma.order.count({ where: { clinicId, status: OrderStatus.PRONTO_PARA_ENTREGA } }),
            this.prisma.order.count({ where: { clinicId, status: OrderStatus.ENTREGUE } }),
            this.prisma.order.count({ where: { clinicId, status: OrderStatus.CANCELADO } }),
        ]);

        return {
            pending,
            awaitingStock,
            ready,
            delivered,
            cancelled,
            inProgress: awaitingStock + ready // Aggregated metric
        };
    }

    async swapReservationLot(clinicId: string, orderId: string, reservationId: string, newLotId: string, userId?: string) {
        const reservation = await this.prisma.stockReservation.findFirst({
            where: { id: reservationId, orderId, clinicId, status: 'ACTIVE' },
            include: { lot: true },
        });

        if (!reservation) {
            throw new BadRequestException('Reserva não encontrada ou já inativa');
        }

        // Validate new lot exists and belongs to the same product
        const newLot = await this.prisma.stockLot.findFirst({
            where: { id: newLotId, clinicId },
            include: { reservations: { where: { status: 'ACTIVE' } } },
        });

        if (!newLot) {
            throw new BadRequestException('Lote destino não encontrado');
        }

        if (newLot.productId !== reservation.lot.productId) {
            throw new BadRequestException('O lote destino deve ser do mesmo produto');
        }

        // Check availability in new lot
        const reservedInNewLot = newLot.reservations.reduce((sum: number, r: any) => sum + r.quantity, 0);
        const availableInNewLot = newLot.quantity - reservedInNewLot;

        if (availableInNewLot < reservation.quantity) {
            throw new BadRequestException(`Lote destino só tem ${availableInNewLot} unidades disponíveis (necessário: ${reservation.quantity})`);
        }

        // Execute swap in transaction
        const result = await this.prisma.$transaction(async (tx) => {
            // Cancel old reservation
            await tx.stockReservation.update({
                where: { id: reservationId },
                data: { status: 'CANCELLED' },
            });

            // Create new reservation on the new lot
            const newReservation = await tx.stockReservation.create({
                data: {
                    clinicId,
                    orderId,
                    orderItemId: reservation.orderItemId,
                    lotId: newLotId,
                    productId: reservation.productId,
                    quantity: reservation.quantity,
                    status: 'ACTIVE',
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
                include: { lot: true },
            });

            return newReservation;
        });

        return result;
    }
}
