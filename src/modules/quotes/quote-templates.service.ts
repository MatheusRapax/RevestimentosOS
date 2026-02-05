import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateQuoteTemplateDto, UpdateQuoteTemplateDto } from './dto/quote-template.dto';

@Injectable()
export class QuoteTemplatesService {
    constructor(private prisma: PrismaService) { }

    async findAll(clinicId: string) {
        return this.prisma.quoteTemplate.findMany({
            where: { clinicId },
            orderBy: [
                { isDefault: 'desc' },
                { name: 'asc' }
            ],
        });
    }

    async findOne(id: string, clinicId: string) {
        const template = await this.prisma.quoteTemplate.findFirst({
            where: { id, clinicId },
        });

        if (!template) {
            throw new NotFoundException('Template não encontrado');
        }

        return template;
    }

    async findDefault(clinicId: string) {
        return this.prisma.quoteTemplate.findFirst({
            where: { clinicId, isDefault: true },
        });
    }

    async create(clinicId: string, dto: CreateQuoteTemplateDto) {
        // Se for marcado como default, remove o default dos outros
        if (dto.isDefault) {
            await this.prisma.quoteTemplate.updateMany({
                where: { clinicId, isDefault: true },
                data: { isDefault: false },
            });
        }

        // Se é o primeiro template, marca como default
        const count = await this.prisma.quoteTemplate.count({ where: { clinicId } });
        const shouldBeDefault = count === 0 || dto.isDefault;

        return this.prisma.quoteTemplate.create({
            data: {
                clinicId,
                ...dto,
                isDefault: shouldBeDefault,
            },
        });
    }

    async update(id: string, clinicId: string, dto: UpdateQuoteTemplateDto) {
        const existing = await this.findOne(id, clinicId);

        // Se marcar como default, remove o default dos outros
        if (dto.isDefault && !existing.isDefault) {
            await this.prisma.quoteTemplate.updateMany({
                where: { clinicId, isDefault: true, id: { not: id } },
                data: { isDefault: false },
            });
        }

        return this.prisma.quoteTemplate.update({
            where: { id },
            data: dto,
        });
    }

    async setDefault(id: string, clinicId: string) {
        await this.findOne(id, clinicId);

        // Remove default de todos
        await this.prisma.quoteTemplate.updateMany({
            where: { clinicId, isDefault: true },
            data: { isDefault: false },
        });

        // Marca este como default
        return this.prisma.quoteTemplate.update({
            where: { id },
            data: { isDefault: true },
        });
    }

    async remove(id: string, clinicId: string) {
        const template = await this.findOne(id, clinicId);

        await this.prisma.quoteTemplate.delete({ where: { id } });

        // Se era default, marca outro como default
        if (template.isDefault) {
            const next = await this.prisma.quoteTemplate.findFirst({
                where: { clinicId },
                orderBy: { createdAt: 'asc' },
            });
            if (next) {
                await this.prisma.quoteTemplate.update({
                    where: { id: next.id },
                    data: { isDefault: true },
                });
            }
        }

        return { deleted: true };
    }
}
