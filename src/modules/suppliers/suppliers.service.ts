import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';

@Injectable()
export class SuppliersService {
    constructor(private prisma: PrismaService) { }

    async findAll(clinicId: string, filters?: { isActive?: boolean }) {
        const where: any = { clinicId };

        if (filters?.isActive !== undefined) {
            where.isActive = filters.isActive;
        }

        return this.prisma.supplier.findMany({
            where,
            orderBy: { name: 'asc' },
        });
    }

    async findOne(clinicId: string, id: string) {
        const supplier = await this.prisma.supplier.findFirst({
            where: { id, clinicId },
            include: {
                purchaseOrders: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!supplier) {
            throw new NotFoundException('Fornecedor não encontrado');
        }

        return supplier;
    }

    async create(clinicId: string, data: {
        name: string;
        cnpj?: string;
        email?: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
        notes?: string;
    }) {
        return this.prisma.supplier.create({
            data: {
                clinicId,
                ...data,
            },
        });
    }

    async update(clinicId: string, id: string, data: {
        name?: string;
        cnpj?: string;
        email?: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
        notes?: string;
        isActive?: boolean;
    }) {
        const supplier = await this.findOne(clinicId, id);

        return this.prisma.supplier.update({
            where: { id: supplier.id },
            data,
        });
    }

    async delete(clinicId: string, id: string) {
        const supplier = await this.findOne(clinicId, id);

        // Soft delete - apenas desativa
        return this.prisma.supplier.update({
            where: { id: supplier.id },
            data: { isActive: false },
        });
    }
}
