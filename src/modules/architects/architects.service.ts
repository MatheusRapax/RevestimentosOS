import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateArchitectDto } from './dto/create-architect.dto';
import { UpdateArchitectDto } from './dto/update-architect.dto';

@Injectable()
export class ArchitectsService {
    constructor(private prisma: PrismaService) { }

    async create(clinicId: string, createArchitectDto: CreateArchitectDto) {
        return this.prisma.architect.create({
            data: {
                ...createArchitectDto,
                clinicId,
            },
        });
    }

    async findAll(clinicId: string, isActive?: boolean) {
        const where: any = { clinicId };

        if (isActive !== undefined) {
            where.isActive = isActive;
        }

        return this.prisma.architect.findMany({
            where,
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string, clinicId: string) {
        const architect = await this.prisma.architect.findFirst({
            where: { id, clinicId },
        });

        if (!architect) {
            throw new NotFoundException('Arquiteto não encontrado');
        }

        return architect;
    }

    async update(id: string, clinicId: string, updateArchitectDto: UpdateArchitectDto) {
        await this.findOne(id, clinicId);

        return this.prisma.architect.update({
            where: { id },
            data: updateArchitectDto,
        });
    }

    async softDelete(id: string, clinicId: string) {
        await this.findOne(id, clinicId);

        return this.prisma.architect.update({
            where: { id },
            data: { isActive: false },
        });
    }

    /**
     * Get architect commission report
     */
    async getCommissionReport(architectId: string, clinicId: string, startDate?: Date, endDate?: Date) {
        await this.findOne(architectId, clinicId);

        const where: any = {
            architectId,
            clinicId,
            status: 'CONVERTED',
        };

        if (startDate && endDate) {
            where.createdAt = {
                gte: startDate,
                lte: endDate,
            };
        }

        const quotes = await this.prisma.quote.findMany({
            where,
            include: {
                customer: { select: { name: true } },
                order: { select: { status: true, totalCents: true } },
            },
        });

        const architect = await this.findOne(architectId, clinicId);
        const commissionRate = architect.commissionRate || 0;

        const totalSales = quotes.reduce((sum, q) => sum + (q.order?.totalCents || 0), 0);
        const totalCommission = Math.round(totalSales * (commissionRate / 100));

        return {
            architect,
            period: { startDate, endDate },
            totalQuotes: quotes.length,
            totalSalesCents: totalSales,
            commissionRate,
            totalCommissionCents: totalCommission,
            quotes: quotes.map(q => ({
                quoteId: q.id,
                quoteNumber: q.number,
                customerName: q.customer.name,
                orderStatus: q.order?.status,
                totalCents: q.order?.totalCents || 0,
                commissionCents: Math.round((q.order?.totalCents || 0) * (commissionRate / 100)),
            })),
        };
    }
}
