import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(clinicId: string, dto: CreatePromotionDto) {
        const { productIds, ...data } = dto;

        return this.prisma.promotion.create({
            data: {
                ...data,
                clinicId,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                products: {
                    create: productIds.map((productId) => ({
                        productId,
                    })),
                },
            },
            include: {
                products: {
                    include: { product: true },
                },
            },
        });
    }

    async findAll(clinicId: string) {
        return this.prisma.promotion.findMany({
            where: { clinicId },
            include: {
                products: {
                    include: { product: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findActive(clinicId: string) {
        const now = new Date();
        return this.prisma.promotion.findMany({
            where: {
                clinicId,
                isActive: true,
                startDate: { lte: now },
                endDate: { gte: now },
            },
            include: {
                products: {
                    include: { product: true },
                },
            },
            orderBy: { endDate: 'asc' },
        });
    }

    async findOne(clinicId: string, id: string) {
        const promotion = await this.prisma.promotion.findFirst({
            where: { id, clinicId },
            include: {
                products: {
                    include: { product: true },
                },
            },
        });

        if (!promotion) {
            throw new NotFoundException(`Promoção não encontrada.`);
        }

        return promotion;
    }

    async update(clinicId: string, id: string, dto: UpdatePromotionDto) {
        const promotion = await this.findOne(clinicId, id);

        const { productIds, ...data } = dto;

        // Check if we need to update products
        if (productIds) {
            // Delete old relations and create new ones
            await this.prisma.promotionProduct.deleteMany({
                where: { promotionId: id }
            });
        }

        return this.prisma.promotion.update({
            where: { id },
            data: {
                ...data,
                startDate: data.startDate ? new Date(data.startDate) : undefined,
                endDate: data.endDate ? new Date(data.endDate) : undefined,
                ...(productIds && {
                    products: {
                        create: productIds.map((productId: string) => ({
                            productId,
                        })),
                    }
                })
            },
            include: {
                products: {
                    include: { product: true },
                },
            },
        });
    }

    async remove(clinicId: string, id: string) {
        await this.findOne(clinicId, id); // Verify existence and ownership
        return this.prisma.promotion.delete({
            where: { id },
        });
    }
}
