import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateBrandDto, UpdateBrandDto } from '../dto/brand.dto';

@Injectable()
export class BrandsService {
    constructor(private prisma: PrismaService) { }

    async create(clinicId: string, dto: CreateBrandDto) {
        return this.prisma.brand.create({
            data: {
                ...dto,
                clinicId,
            },
        });
    }

    async findAll(clinicId: string) {
        return this.prisma.brand.findMany({
            where: { clinicId, isActive: true },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string, clinicId: string) {
        return this.prisma.brand.findUnique({
            where: { id },
        });
    }

    async update(id: string, clinicId: string, dto: UpdateBrandDto) {
        return this.prisma.brand.update({
            where: { id },
            data: dto,
        });
    }

    async remove(id: string, clinicId: string) {
        return this.prisma.brand.update({
            where: { id },
            data: { isActive: false },
        });
    }
}
