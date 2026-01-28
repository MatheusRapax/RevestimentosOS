import {
    Injectable,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { ListPatientDto } from './dto/list-patient.dto';

@Injectable()
export class PatientsService {
    constructor(private prisma: PrismaService) { }

    async create(clinicId: string, createPatientDto: CreatePatientDto) {
        const patient = await this.prisma.patient.create({
            data: {
                ...createPatientDto,
                clinicId,
                birthDate: createPatientDto.birthDate
                    ? new Date(createPatientDto.birthDate)
                    : null,
            },
        });

        return patient;
    }

    async findAll(clinicId: string, filters: ListPatientDto) {
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

        if (filters.isActive !== undefined) {
            where.isActive = filters.isActive;
        }

        const patients = await this.prisma.patient.findMany({
            where,
            orderBy: {
                name: 'asc',
            },
        });

        return patients;
    }

    async findOne(id: string, clinicId: string) {
        const patient = await this.prisma.patient.findFirst({
            where: {
                id,
                clinicId,
            },
        });

        if (!patient) {
            throw new NotFoundException('Paciente não encontrado');
        }

        return patient;
    }

    async update(
        id: string,
        clinicId: string,
        updatePatientDto: UpdatePatientDto,
    ) {
        // Verify patient exists and belongs to clinic
        await this.findOne(id, clinicId);

        const patient = await this.prisma.patient.update({
            where: { id },
            data: {
                ...updatePatientDto,
                birthDate: updatePatientDto.birthDate
                    ? new Date(updatePatientDto.birthDate)
                    : undefined,
            },
        });

        return patient;
    }

    async softDelete(id: string, clinicId: string) {
        // Verify patient exists and belongs to clinic
        await this.findOne(id, clinicId);

        const patient = await this.prisma.patient.update({
            where: { id },
            data: {
                isActive: false,
            },
        });

        return patient;
    }

    // ========== CLINICAL RECORD v2 ==========

    async getPatientTimeline(patientId: string, clinicId: string) {
        // Verify patient exists and belongs to clinic
        await this.findOne(patientId, clinicId);

        // Fetch appointments
        const appointments = await this.prisma.appointment.findMany({
            where: { patientId, clinicId },
            include: {
                professional: { select: { name: true } },
            },
            orderBy: { startAt: 'asc' },
        });

        // Fetch encounters
        const encounters = await this.prisma.encounter.findMany({
            where: { patientId, clinicId },
            include: {
                professional: { select: { name: true } },
                procedures: true,
                consumables: true,
            },
            orderBy: { openedAt: 'asc' },
        });

        // Build unified timeline
        const timeline: Array<{
            type: 'appointment' | 'encounter';
            date: Date;
            label: string;
            referenceId: string;
            status: string;
            professionalName?: string;
            details?: any;
        }> = [];

        // Add appointments
        for (const apt of appointments) {
            timeline.push({
                type: 'appointment',
                date: apt.startAt,
                label: `Agendamento - ${apt.professional.name || 'Profissional'}`,
                referenceId: apt.id,
                status: apt.status,
                professionalName: apt.professional.name || undefined,
            });
        }

        // Add encounters
        for (const enc of encounters) {
            timeline.push({
                type: 'encounter',
                date: enc.openedAt,
                label: `Atendimento - ${enc.professional.name || 'Profissional'}`,
                referenceId: enc.id,
                status: enc.status,
                professionalName: enc.professional.name || undefined,
                details: {
                    proceduresCount: enc.procedures.length,
                    consumablesCount: enc.consumables.length,
                },
            });
        }


        // Sort by date descending (most recent first)
        timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

        return timeline;
    }

    async getPatientSummary(patientId: string, clinicId: string) {
        // Verify patient exists and belongs to clinic
        const patient = await this.findOne(patientId, clinicId);

        // Count appointments
        const totalAppointments = await this.prisma.appointment.count({
            where: { patientId, clinicId },
        });

        // Count encounters
        const totalEncounters = await this.prisma.encounter.count({
            where: { patientId, clinicId },
        });

        // Count active (OPEN) encounters
        const activeEncounters = await this.prisma.encounter.count({
            where: { patientId, clinicId, status: 'OPEN' },
        });

        // Get last visit (most recent encounter)
        const lastEncounter = await this.prisma.encounter.findFirst({
            where: { patientId, clinicId },
            orderBy: { openedAt: 'desc' },
            select: { openedAt: true },
        });

        return {
            patient,
            totalAppointments,
            totalEncounters,
            activeEncounters,
            lastVisit: lastEncounter?.openedAt || null,
        };
    }
}
