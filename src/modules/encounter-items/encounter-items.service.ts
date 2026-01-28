import {
    Injectable,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { AddProcedureDto } from './dto/add-procedure.dto';
import { AddConsumableDto } from './dto/add-consumable.dto';
import { EncounterStatus } from '@prisma/client';

@Injectable()
export class EncounterItemsService {
    constructor(
        private prisma: PrismaService,
        private stockService: StockService,
    ) { }

    // ========== PROCEDURES ==========

    async addProcedure(
        encounterId: string,
        clinicId: string,
        dto: AddProcedureDto,
    ) {
        // Validate encounter exists, belongs to clinic, and is OPEN
        await this.validateEncounterIsOpen(encounterId, clinicId);

        // Create procedure
        const procedure = await this.prisma.procedurePerformed.create({
            data: {
                clinicId,
                encounterId,
                name: dto.name,
                priceCents: dto.priceCents,
                notes: dto.notes,
            },
        });

        return procedure;
    }

    async listProcedures(encounterId: string, clinicId: string) {
        // Validate encounter belongs to clinic
        await this.validateEncounterBelongsToClinic(encounterId, clinicId);

        const procedures = await this.prisma.procedurePerformed.findMany({
            where: {
                encounterId,
                clinicId,
                isActive: true,
            },
            orderBy: {
                performedAt: 'asc',
            },
        });

        return procedures;
    }

    async removeProcedure(
        procedureId: string,
        encounterId: string,
        clinicId: string,
    ) {
        // Validate encounter is OPEN
        await this.validateEncounterIsOpen(encounterId, clinicId);

        // Validate procedure exists and belongs to encounter/clinic
        const procedure = await this.prisma.procedurePerformed.findFirst({
            where: {
                id: procedureId,
                encounterId,
                clinicId,
            },
        });

        if (!procedure) {
            throw new NotFoundException('Procedimento não encontrado');
        }

        // Soft delete procedure
        await this.prisma.procedurePerformed.update({
            where: { id: procedureId },
            data: { isActive: false },
        });

        return { message: 'Procedimento removido com sucesso' };
    }

    // ========== CONSUMABLES ==========

    async addConsumable(
        encounterId: string,
        clinicId: string,
        dto: AddConsumableDto,
    ) {
        // Validate encounter exists, belongs to clinic, and is OPEN
        const encounter = await this.validateEncounterIsOpen(encounterId, clinicId);

        // Get patient name for destination
        const patient = await this.prisma.patient.findUnique({
            where: { id: encounter.patientId },
            select: { name: true },
        });

        // Create consumable
        const consumable = await this.prisma.consumableUsage.create({
            data: {
                clinicId,
                encounterId,
                itemName: dto.itemName,
                productId: dto.productId,
                quantity: dto.quantity || 1,
                unit: dto.unit,
                notes: dto.notes,
            },
        });

        // If product ID is provided, deduct stock
        if (dto.productId) {
            try {
                await this.stockService.removeStock(clinicId, {
                    productId: dto.productId,
                    quantity: dto.quantity || 1,
                    reason: `Consumo em atendimento - Paciente: ${patient?.name || 'Desconhecido'}`,
                    destinationType: 'PATIENT',
                    destinationName: patient?.name,
                    encounterId,
                });
            } catch (error) {
                // If stock deduction fails (e.g. low stock), decide policy.
                // For now, we allow adding consumable but maybe warn or just fail?
                // The implementation plan implies auto-deduction.
                // If we want strict control, we should fail the consumable addition.
                // So we should revert the consumable creation or run in transaction.
                // But StockService.removeStock runs in its own transaction.
                // Ideally we wrap everything in one transaction or delete consumable if stock fails.
                // Simpler approach: Try removing stock first?
                // But we need to create consumable record anyway.
                // Let's delete consumable if stock fails.
                await this.prisma.consumableUsage.delete({ where: { id: consumable.id } });
                throw error; // Propagate error (e.g. "Low Stock")
            }
        }

        return consumable;
    }

    async listConsumables(encounterId: string, clinicId: string) {
        // Validate encounter belongs to clinic
        await this.validateEncounterBelongsToClinic(encounterId, clinicId);

        const consumables = await this.prisma.consumableUsage.findMany({
            where: {
                encounterId,
                clinicId,
                isActive: true,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        return consumables;
    }

    async removeConsumable(
        consumableId: string,
        encounterId: string,
        clinicId: string,
    ) {
        // Validate encounter is OPEN
        await this.validateEncounterIsOpen(encounterId, clinicId);

        // Validate consumable exists and belongs to encounter/clinic
        const consumable = await this.prisma.consumableUsage.findFirst({
            where: {
                id: consumableId,
                encounterId,
                clinicId,
            },
        });

        if (!consumable) {
            throw new NotFoundException('Consumível não encontrado');
        }

        // Soft delete consumable
        await this.prisma.consumableUsage.update({
            where: { id: consumableId },
            data: { isActive: false },
        });

        return { message: 'Consumível removido com sucesso' };
    }

    // ========== HELPERS ==========

    private async validateEncounterIsOpen(
        encounterId: string,
        clinicId: string,
    ) {
        const encounter = await this.prisma.encounter.findFirst({
            where: {
                id: encounterId,
                clinicId,
            },
        });

        if (!encounter) {
            throw new NotFoundException('Atendimento não encontrado');
        }

        if (encounter.status === EncounterStatus.CLOSED) {
            throw new ForbiddenException(
                'Não é possível modificar itens de um atendimento fechado',
            );
        }

        return encounter;
    }

    private async validateEncounterBelongsToClinic(
        encounterId: string,
        clinicId: string,
    ) {
        const encounter = await this.prisma.encounter.findFirst({
            where: {
                id: encounterId,
                clinicId,
            },
        });

        if (!encounter) {
            throw new NotFoundException('Atendimento não encontrado');
        }

        return encounter;
    }
}
