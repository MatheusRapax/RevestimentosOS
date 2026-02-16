import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';

@Injectable()
export class CategoriesService {
    constructor(private prisma: PrismaService) { }

    async create(clinicId: string, dto: CreateCategoryDto) {
        return this.prisma.category.create({
            data: {
                ...dto,
                clinicId,
            },
        });
    }

    async findAll(clinicId: string) {
        return this.prisma.category.findMany({
            where: { clinicId, isActive: true },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string, clinicId: string) {
        return this.prisma.category.findUnique({
            where: { id },
        });
    }

    async update(id: string, clinicId: string, dto: UpdateCategoryDto) {
        return this.prisma.category.update({
            where: { id },
            data: dto,
        });
    }

    async remove(id: string, clinicId: string) {
        return this.prisma.category.update({
            where: { id },
            data: { isActive: false },
        });
    }
}
