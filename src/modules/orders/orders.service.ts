import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
    constructor(private prisma: PrismaService) { }

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

    async updateStatus(clinicId: string, id: string, status: OrderStatus) {
        const updateData: any = { status };

        if (status === OrderStatus.PAGO) {
            updateData.confirmedAt = new Date(); // Semantic mapping: PAGO = confirmed
        } else if (status === OrderStatus.ENTREGUE) {
            updateData.deliveredAt = new Date();
        }

        // Transaction to handle cancellations
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.update({
                where: { id },
                data: updateData,
            });

            // If CANCELADO, cancel reservations
            if (status === OrderStatus.CANCELADO) {
                await tx.stockReservation.updateMany({
                    where: { orderId: id, status: 'ACTIVE' },
                    data: { status: 'CANCELLED' },
                });
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
