import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { AuditAction } from '@prisma/client';

export interface CreateProcedureDto {
    name: string;
    description?: string;
    priceCents: number;
    durationMin?: number;
}

export interface UpdateProcedureDto {
    name?: string;
    description?: string;
    priceCents?: number;
    durationMin?: number;
    isActive?: boolean;
}

export interface AddConsumableDto {
    productId: string;
    quantity: number;
}

@Injectable()
export class ProceduresService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
    ) { }

    /**
     * List all procedures for a clinic
     */
    async findAll(clinicId: string, includeInactive = false) {
        return this.prisma.procedure.findMany({
            where: {
                clinicId,
                ...(includeInactive ? {} : { isActive: true }),
            },
            include: {
                consumables: {
                    include: {
                        product: {
                            select: { id: true, name: true, unit: true, priceCents: true },
                        },
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Get a single procedure
     */
    async findOne(clinicId: string, id: string) {
        const procedure = await this.prisma.procedure.findFirst({
            where: { id, clinicId },
            include: {
                consumables: {
                    include: {
                        product: {
                            select: { id: true, name: true, unit: true, priceCents: true },
                        },
                    },
                },
            },
        });

        if (!procedure) {
            throw new NotFoundException('Procedimento não encontrado');
        }

        return procedure;
    }

    /**
     * Create a new procedure
     */
    async create(clinicId: string, userId: string, dto: CreateProcedureDto) {
        const procedure = await this.prisma.procedure.create({
            data: {
                clinicId,
                name: dto.name,
                description: dto.description,
                priceCents: dto.priceCents,
                durationMin: dto.durationMin,
            },
        });

        await this.auditService.log({
            clinicId,
            userId,
            action: AuditAction.CREATE,
            entity: 'Procedure',
            entityId: procedure.id,
            message: `Procedimento criado: ${dto.name}`,
        });

        return procedure;
    }

    /**
     * Update a procedure
     */
    async update(clinicId: string, id: string, userId: string, dto: UpdateProcedureDto) {
        await this.findOne(clinicId, id);

        const updated = await this.prisma.procedure.update({
            where: { id },
            data: dto,
        });

        await this.auditService.log({
            clinicId,
            userId,
            action: AuditAction.UPDATE,
            entity: 'Procedure',
            entityId: id,
            message: 'Procedimento atualizado',
        });

        return updated;
    }

    /**
     * Soft delete a procedure
     */
    async remove(clinicId: string, id: string, userId: string) {
        await this.findOne(clinicId, id);

        await this.prisma.procedure.update({
            where: { id },
            data: { isActive: false },
        });

        await this.auditService.log({
            clinicId,
            userId,
            action: AuditAction.DELETE,
            entity: 'Procedure',
            entityId: id,
            message: 'Procedimento removido',
        });

        return { success: true };
    }

    /**
     * Add consumable to procedure
     */
    async addConsumable(clinicId: string, procedureId: string, userId: string, dto: AddConsumableDto) {
        await this.findOne(clinicId, procedureId);

        // Validate product exists
        const product = await this.prisma.product.findFirst({
            where: { id: dto.productId, clinicId, isActive: true },
        });

        if (!product) {
            throw new NotFoundException('Produto não encontrado');
        }

        const consumable = await this.prisma.procedureConsumable.upsert({
            where: {
                procedureId_productId: {
                    procedureId,
                    productId: dto.productId,
                },
            },
            update: { quantity: dto.quantity },
            create: {
                procedureId,
                productId: dto.productId,
                quantity: dto.quantity,
            },
        });

        await this.auditService.log({
            clinicId,
            userId,
            action: AuditAction.UPDATE,
            entity: 'Procedure',
            entityId: procedureId,
            message: `Insumo adicionado: ${product.name}`,
        });

        return consumable;
    }

    /**
     * Remove consumable from procedure
     */
    async removeConsumable(clinicId: string, procedureId: string, productId: string, userId: string) {
        await this.findOne(clinicId, procedureId);

        await this.prisma.procedureConsumable.delete({
            where: {
                procedureId_productId: {
                    procedureId,
                    productId,
                },
            },
        });

        await this.auditService.log({
            clinicId,
            userId,
            action: AuditAction.UPDATE,
            entity: 'Procedure',
            entityId: procedureId,
            message: 'Insumo removido',
        });

        return { success: true };
    }
}
