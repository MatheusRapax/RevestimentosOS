import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ListCustomerDto } from './dto/list-customer.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class CustomersService {
    constructor(private prisma: PrismaService) { }

    async create(clinicId: string, createCustomerDto: CreateCustomerDto) {
        // Sanitize architectId to avoid Foreign Key violations with empty strings
        const data: any = { ...createCustomerDto };
        if (!data.architectId) {
            delete data.architectId;
        }

        const customer = await this.prisma.customer.create({
            data: {
                ...data,
                clinicId,
            },
            include: {
                architect: {
                    select: { id: true, name: true },
                },
            },
        });

        return customer;
    }

    async findAll(clinicId: string, filters: ListCustomerDto) {
        const where: any = {
            clinicId,
        };

        if (filters.name) {
            where.name = {
                contains: filters.name,
                mode: 'insensitive',
            };
        }

        if (filters.document) {
            where.document = {
                contains: filters.document,
                mode: 'insensitive',
            };
        }

        if (filters.type) {
            where.type = filters.type;
        }

        if (filters.architectId) {
            where.architectId = filters.architectId;
        }

        if (filters.isActive !== undefined) {
            where.isActive = filters.isActive;
        }

        const customers = await this.prisma.customer.findMany({
            where,
            include: {
                architect: {
                    select: { id: true, name: true },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });

        return customers;
    }

    async findOne(id: string, clinicId: string) {
        const customer = await this.prisma.customer.findFirst({
            where: {
                id,
                clinicId,
            },
            include: {
                architect: {
                    select: { id: true, name: true, commissionRate: true },
                },
            },
        });

        if (!customer) {
            throw new NotFoundException('Cliente não encontrado');
        }

        return customer;
    }

    async update(
        id: string,
        clinicId: string,
        updateCustomerDto: UpdateCustomerDto,
    ) {
        // Verify customer exists and belongs to clinic
        await this.findOne(id, clinicId);

        // Sanitize architectId
        const data: any = { ...updateCustomerDto };
        if (data.architectId === '') {
            data.architectId = null;
        }

        const customer = await this.prisma.customer.update({
            where: { id },
            data,
            include: {
                architect: {
                    select: { id: true, name: true },
                },
            },
        });

        return customer;
    }

    async softDelete(id: string, clinicId: string) {
        // Verify customer exists and belongs to clinic
        await this.findOne(id, clinicId);

        const customer = await this.prisma.customer.update({
            where: { id },
            data: {
                isActive: false,
            },
        });

        return customer;
    }

    /**
     * Get customer sales summary (quotes and orders count)
     */
    async getCustomerSummary(customerId: string, clinicId: string) {
        const customer = await this.findOne(customerId, clinicId);

        const totalQuotes = await this.prisma.quote.count({
            where: { customerId, clinicId },
        });

        const totalOrders = await this.prisma.order.count({
            where: { customerId, clinicId },
        });

        const pendingOrders = await this.prisma.order.count({
            where: { customerId, clinicId, status: OrderStatus.CRIADO },
        });

        const lastOrder = await this.prisma.order.findFirst({
            where: { customerId, clinicId },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true, totalCents: true },
        });

        return {
            customer,
            totalQuotes,
            totalOrders,
            pendingOrders,
            lastOrder: lastOrder || null,
        };
    }
}
