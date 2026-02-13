import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateDeliveryDto, UpdateDeliveryDto } from './dto/create-delivery.dto';
import { DeliveryStatus, OrderStatus } from '@prisma/client';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class DeliveriesService {
    constructor(
        private prisma: PrismaService,
        @Inject(forwardRef(() => OrdersService))
        private ordersService: OrdersService
    ) { }

    async create(clinicId: string, createDto: CreateDeliveryDto) {
        const order = await this.prisma.order.findFirst({
            where: { id: createDto.orderId, clinicId },
            include: { delivery: true }
        });

        if (!order) {
            throw new NotFoundException('Pedido não encontrado');
        }

        if (order.delivery) {
            throw new BadRequestException('Pedido já possui uma entrega agendada');
        }

        // Validate: only orders ready for delivery can have a delivery scheduled
        const allowedStatuses: OrderStatus[] = [
            OrderStatus.PRONTO_PARA_ENTREGA,
            OrderStatus.EM_SEPARACAO,
        ];

        if (!allowedStatuses.includes(order.status)) {
            throw new BadRequestException(
                `Só é possível agendar entrega para pedidos com status "Pronto para Entrega" ou "Em Separação". Status atual: ${order.status}`
            );
        }

        return this.prisma.delivery.create({
            data: {
                clinicId,
                orderId: createDto.orderId,
                scheduledDate: createDto.scheduledDate ? new Date(createDto.scheduledDate) : null,
                driverName: createDto.driverName,
                vehiclePlate: createDto.vehiclePlate,
                notes: createDto.notes,
                status: 'SCHEDULED'
            },
            include: {
                order: {
                    select: {
                        number: true,
                        customer: { select: { name: true, address: true, city: true } }
                    }
                }
            }
        });
    }

    async findAll(clinicId: string, status?: DeliveryStatus) {
        const where: any = { clinicId };
        if (status) {
            where.status = status;
        }

        return this.prisma.delivery.findMany({
            where,
            include: {
                order: {
                    select: {
                        number: true,
                        totalCents: true,
                        status: true,
                        customer: { select: { name: true, address: true, city: true } }
                    }
                }
            },
            orderBy: { scheduledDate: 'asc' }
        });
    }

    async findOne(id: string, clinicId: string) {
        const delivery = await this.prisma.delivery.findFirst({
            where: { id, clinicId },
            include: {
                order: {
                    include: {
                        customer: true,
                        items: { include: { product: true } }
                    }
                }
            }
        });

        if (!delivery) {
            throw new NotFoundException('Entrega não encontrada');
        }

        return delivery;
    }

    async update(id: string, clinicId: string, updateDto: UpdateDeliveryDto) {
        const delivery = await this.findOne(id, clinicId);

        const result = await this.prisma.delivery.update({
            where: { id },
            data: {
                ...updateDto,
                scheduledDate: updateDto.scheduledDate ? new Date(updateDto.scheduledDate) : undefined,
            },
            include: {
                order: {
                    select: {
                        id: true,
                        number: true,
                        status: true,
                        customer: { select: { name: true } }
                    }
                }
            }
        });

        // --- ORDER STATUS AUTOMATION ---
        const newStatus = updateDto.status;
        const orderId = delivery.orderId;
        const orderStatus = delivery.order.status;

        if (newStatus === 'IN_TRANSIT' && orderStatus !== OrderStatus.SAIU_PARA_ENTREGA) {
            // Delivery started transit → Order is out for delivery
            try {
                await this.ordersService.updateStatus(clinicId, orderId, OrderStatus.SAIU_PARA_ENTREGA);
                console.log(`[Delivery→Order] Order ${orderId} → SAIU_PARA_ENTREGA`);
            } catch (error) {
                console.error(`[Delivery→Order] Failed to update order ${orderId} to SAIU_PARA_ENTREGA:`, error);
            }
        }

        if (newStatus === 'DELIVERED' && orderStatus !== OrderStatus.ENTREGUE) {
            // Delivery completed → Order is delivered (triggers auto-finalization cascade)
            try {
                await this.ordersService.updateStatus(clinicId, orderId, OrderStatus.ENTREGUE);
                console.log(`[Delivery→Order] Order ${orderId} → ENTREGUE (auto-finalized)`);
            } catch (error) {
                console.error(`[Delivery→Order] Failed to update order ${orderId} to ENTREGUE:`, error);
            }
        }

        return result;
    }
}
