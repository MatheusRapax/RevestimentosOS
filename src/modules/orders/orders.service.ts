import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
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
            },
        });
    }

    async updateStatus(clinicId: string, id: string, status: string) {
        const updateData: any = { status };

        if (status === 'CONFIRMED') {
            updateData.confirmedAt = new Date();
        } else if (status === 'DELIVERED') {
            updateData.deliveredAt = new Date();
        }

        return this.prisma.order.update({
            where: { id },
            data: updateData,
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
        const [pending, awaitingStock, partialReady, inProgress, ready, delivered, cancelled] = await Promise.all([
            this.prisma.order.count({ where: { clinicId, status: 'PENDING' } }),
            this.prisma.order.count({ where: { clinicId, status: 'AWAITING_STOCK' } }),
            this.prisma.order.count({ where: { clinicId, status: 'PARTIAL_READY' } }),
            this.prisma.order.count({ where: { clinicId, status: { in: [OrderStatus.CONFIRMED, OrderStatus.IN_SEPARATION] } } }),
            this.prisma.order.count({ where: { clinicId, status: OrderStatus.READY } }),
            this.prisma.order.count({ where: { clinicId, status: OrderStatus.DELIVERED } }),
            this.prisma.order.count({ where: { clinicId, status: OrderStatus.CANCELLED } }),
        ]);

        return { pending, awaitingStock, partialReady, inProgress, ready, delivered, cancelled };
    }
}
