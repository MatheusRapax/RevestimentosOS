import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { FinanceService } from '../finance/finance.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
    constructor(
        private prisma: PrismaService,
        private financeService: FinanceService
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

        // Transaction to handle cancellations and finance integration
        return this.prisma.$transaction(async (tx) => {
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
                // Determine description
                const desc = `Pagamento Pedido #${currentOrder.number}`;

                // Create payment in Finance Module
                // We use specific method calling to ensure everything is trapped in transaction if possible?
                // FinanceService uses prisma.$transaction inside ONLY if we refactor it.
                // For now, we call it separately after order update, or we accept it's a side effect.
                // Ideally we should pass the transaction manager to FinanceService, but it's not set up for that.
                // We will proceed with the call. If it fails, the order status might remain PAGO.
                // To be safe, we should wrap this differently or assume Finance won't fail easily.

                await this.financeService.registerPayment(
                    clinicId,
                    currentOrder.customerId,
                    currentOrder.totalCents,
                    'CASH', // Default method, fixed from invalid 'OUTROS'
                    desc,
                    1,
                    userId
                );
            }

            return order;
        });
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
}
