import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateDeliveryDto, UpdateDeliveryDto } from './dto/create-delivery.dto';
import { DeliveryStatus } from '@prisma/client';

@Injectable()
export class DeliveriesService {
    constructor(private prisma: PrismaService) { }

    async create(clinicId: string, createDto: CreateDeliveryDto) {
        // Verify order exists and belongs to clinic
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
        // Verify existence
        await this.findOne(id, clinicId);

        return this.prisma.delivery.update({
            where: { id },
            data: {
                ...updateDto,
                scheduledDate: updateDto.scheduledDate ? new Date(updateDto.scheduledDate) : undefined,
            },
            include: {
                order: {
                    select: {
                        number: true,
                        customer: { select: { name: true } }
                    }
                }
            }
        });
    }
}
