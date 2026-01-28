import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { AuditAction } from '@prisma/client';

export interface CreateSpecialtyDto {
    name: string;
}

export interface UpdateSpecialtyDto {
    name?: string;
}

@Injectable()
export class SpecialtiesService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
    ) { }

    async findAll(clinicId: string) {
        return this.prisma.specialty.findMany({
            where: {
                clinicId,
                isActive: true,
            },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string, clinicId: string) {
        const specialty = await this.prisma.specialty.findFirst({
            where: { id, clinicId, isActive: true },
        });

        if (!specialty) {
            throw new NotFoundException('Especialidade não encontrada');
        }

        return specialty;
    }

    async create(clinicId: string, userId: string, dto: CreateSpecialtyDto) {
        // Check if name already exists
        const existing = await this.prisma.specialty.findFirst({
            where: { clinicId, name: dto.name, isActive: true },
        });

        if (existing) {
            throw new ConflictException('Especialidade já existe');
        }

        const specialty = await this.prisma.specialty.create({
            data: {
                clinicId,
                name: dto.name,
            },
        });

        await this.auditService.log({
            clinicId,
            userId,
            action: AuditAction.CREATE,
            entity: 'Specialty',
            entityId: specialty.id,
            message: `Especialidade criada: ${specialty.name}`,
        });

        return specialty;
    }

    async update(id: string, clinicId: string, userId: string, dto: UpdateSpecialtyDto) {
        await this.findOne(id, clinicId);

        if (dto.name) {
            const existing = await this.prisma.specialty.findFirst({
                where: { clinicId, name: dto.name, isActive: true, id: { not: id } },
            });
            if (existing) {
                throw new ConflictException('Especialidade já existe');
            }
        }

        const specialty = await this.prisma.specialty.update({
            where: { id },
            data: { name: dto.name },
        });

        await this.auditService.log({
            clinicId,
            userId,
            action: AuditAction.UPDATE,
            entity: 'Specialty',
            entityId: id,
            message: `Especialidade atualizada: ${specialty.name}`,
        });

        return specialty;
    }

    async remove(id: string, clinicId: string, userId: string) {
        await this.findOne(id, clinicId);

        // Soft delete
        await this.prisma.specialty.update({
            where: { id },
            data: { isActive: false },
        });

        await this.auditService.log({
            clinicId,
            userId,
            action: AuditAction.DELETE,
            entity: 'Specialty',
            entityId: id,
            message: 'Especialidade removida',
        });

        return { success: true };
    }
}
