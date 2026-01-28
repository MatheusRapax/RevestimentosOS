import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { StartEncounterDto } from './dto/start-encounter.dto';
import { CloseEncounterDto } from './dto/close-encounter.dto';
import { AddRecordDto } from './dto/add-record.dto';
import { EncounterStatus, AppointmentStatus, AuditAction } from '@prisma/client';

@Injectable()
export class EncountersService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
    ) { }

    // ========== BASIC CRUD ==========

    async findAll(clinicId: string, patientId?: string) {
        return this.prisma.encounter.findMany({
            where: {
                clinicId,
                ...(patientId && { patientId }),
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                professional: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async create(clinicId: string, dto: any) {
        return this.prisma.encounter.create({
            data: {
                clinicId,
                patientId: dto.patientId,
                professionalId: dto.professionalId,
                date: dto.date,
                time: dto.time,
                notes: dto.notes,
                status: dto.status || 'OPEN',
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                professional: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }

    async update(id: string, clinicId: string, dto: any) {
        return this.prisma.encounter.update({
            where: {
                id,
                clinicId,
            },
            data: {
                patientId: dto.patientId,
                professionalId: dto.professionalId,
                date: dto.date,
                time: dto.time,
                notes: dto.notes,
                status: dto.status,
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                professional: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }

    async remove(id: string, clinicId: string) {
        // Since Encounter doesn't have isActive, we'll actually delete it
        // Or we can just close it instead
        await this.prisma.encounter.update({
            where: {
                id,
                clinicId,
            },
            data: {
                status: 'CLOSED',
                closedAt: new Date(),
            },
        });
    }

    // ========== SPECIALIZED METHODS ==========


    async startEncounter(clinicId: string, dto: StartEncounterDto) {
        const { patientId, professionalId, appointmentId } = dto;

        // Validate patient belongs to clinic
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, clinicId },
        });

        if (!patient) {
            throw new NotFoundException(
                'Paciente não encontrado ou não pertence a esta clínica',
            );
        }

        // Validate professional belongs to clinic
        const professional = await this.prisma.clinicUser.findFirst({
            where: { userId: professionalId, clinicId },
        });

        if (!professional) {
            throw new NotFoundException(
                'Profissional não encontrado ou não pertence a esta clínica',
            );
        }

        // If appointment provided, validate it
        if (appointmentId) {
            const appointment = await this.prisma.appointment.findFirst({
                where: {
                    id: appointmentId,
                    clinicId,
                    patientId,
                },
            });

            if (!appointment) {
                throw new NotFoundException(
                    'Agendamento não encontrado ou não pertence a esta clínica/paciente',
                );
            }

            // Check if there's already an open encounter for this appointment
            const existingEncounter = await this.prisma.encounter.findFirst({
                where: {
                    appointmentId,
                    status: EncounterStatus.OPEN,
                },
            });

            if (existingEncounter) {
                throw new ConflictException(
                    'Já existe um atendimento aberto para este agendamento',
                );
            }

            // Update appointment status to CHECKED_IN
            await this.prisma.appointment.update({
                where: { id: appointmentId },
                data: { status: AppointmentStatus.CHECKED_IN },
            });
        }

        // Create encounter
        const encounter = await this.prisma.encounter.create({
            data: {
                clinicId,
                patientId,
                professionalId,
                appointmentId,
                date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD
                status: EncounterStatus.OPEN,
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                professional: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                appointment: true,
            },
        });

        // Audit log
        await this.auditService.log({
            clinicId,
            action: AuditAction.CREATE,
            entity: 'Encounter',
            entityId: encounter.id,
            message: 'encounter.started',
        });

        return encounter;
    }

    async findOne(id: string, clinicId: string) {
        const encounter = await this.prisma.encounter.findFirst({
            where: {
                id,
                clinicId,
            },
            include: {
                patient: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        birthDate: true,
                    },
                },
                professional: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                appointment: true,
                records: {
                    orderBy: {
                        createdAt: 'asc',
                    },
                },
            },
        });

        if (!encounter) {
            throw new NotFoundException('Atendimento não encontrado');
        }

        return encounter;
    }

    async addRecord(encounterId: string, clinicId: string, dto: AddRecordDto) {
        // Validate encounter exists and belongs to clinic
        const encounter = await this.prisma.encounter.findFirst({
            where: {
                id: encounterId,
                clinicId,
            },
        });

        if (!encounter) {
            throw new NotFoundException('Atendimento não encontrado');
        }

        // Check if encounter is open
        if (encounter.status === EncounterStatus.CLOSED) {
            throw new ForbiddenException(
                'Não é possível adicionar registros a um atendimento fechado',
            );
        }

        // Create record entry
        const record = await this.prisma.recordEntry.create({
            data: {
                clinicId,
                encounterId,
                type: dto.type,
                content: dto.content,
            },
        });

        return record;
    }

    async closeEncounter(id: string, clinicId: string, dto?: CloseEncounterDto) {
        // Validate encounter exists and belongs to clinic
        const encounter = await this.prisma.encounter.findFirst({
            where: {
                id,
                clinicId,
            },
        });

        if (!encounter) {
            throw new NotFoundException('Atendimento não encontrado');
        }

        // Check if encounter is already closed
        if (encounter.status === EncounterStatus.CLOSED) {
            throw new ForbiddenException('Atendimento já está fechado');
        }

        // Close encounter and lock all records
        const [closedEncounter] = await this.prisma.$transaction([
            this.prisma.encounter.update({
                where: { id },
                data: {
                    status: EncounterStatus.CLOSED,
                    closedAt: new Date(),
                },
                include: {
                    patient: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    professional: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    records: true,
                },
            }),
            this.prisma.recordEntry.updateMany({
                where: { encounterId: id },
                data: { isLocked: true },
            }),
        ]);

        // Audit log
        await this.auditService.log({
            clinicId,
            action: AuditAction.UPDATE,
            entity: 'Encounter',
            entityId: id,
            message: 'encounter.closed',
        });

        // Update associated appointment to COMPLETED if exists
        if (encounter.appointmentId) {
            await this.prisma.appointment.update({
                where: { id: encounter.appointmentId },
                data: { status: 'COMPLETED' },
            });
        }

        return closedEncounter;
    }

    // ========== TIMELINE ==========

    async getTimeline(id: string, clinicId: string) {
        // Get encounter with all related data
        const encounter = await this.prisma.encounter.findFirst({
            where: { id, clinicId },
            include: {
                patient: {
                    select: { id: true, name: true, email: true, phone: true },
                },
                professional: {
                    select: { id: true, name: true, email: true },
                },
                appointment: true,
                records: {
                    orderBy: { createdAt: 'asc' },
                },
                procedures: {
                    orderBy: { performedAt: 'asc' },
                },
                consumables: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!encounter) {
            throw new NotFoundException('Atendimento não encontrado');
        }

        // Build timeline events
        const events: Array<{
            type: 'start' | 'record' | 'procedure' | 'consumable' | 'close';
            timestamp: Date;
            data: any;
        }> = [];

        // Start event
        events.push({
            type: 'start',
            timestamp: encounter.openedAt,
            data: {
                patient: encounter.patient,
                professional: encounter.professional,
            },
        });

        // Records
        for (const record of encounter.records) {
            events.push({
                type: 'record',
                timestamp: record.createdAt,
                data: record,
            });
        }

        // Procedures
        for (const procedure of encounter.procedures) {
            events.push({
                type: 'procedure',
                timestamp: procedure.performedAt,
                data: procedure,
            });
        }

        // Consumables
        for (const consumable of encounter.consumables) {
            events.push({
                type: 'consumable',
                timestamp: consumable.createdAt,
                data: consumable,
            });
        }

        // Close event (if closed)
        if (encounter.status === EncounterStatus.CLOSED && encounter.closedAt) {
            events.push({
                type: 'close',
                timestamp: encounter.closedAt,
                data: {},
            });
        }

        // Sort by timestamp
        events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        return {
            encounter: {
                id: encounter.id,
                status: encounter.status,
                date: encounter.date,
                notes: encounter.notes,
                openedAt: encounter.openedAt,
                closedAt: encounter.closedAt,
                patient: encounter.patient,
                professional: encounter.professional,
                appointment: encounter.appointment,
            },
            timeline: events,
            summary: {
                recordsCount: encounter.records.length,
                proceduresCount: encounter.procedures.length,
                consumablesCount: encounter.consumables.length,
            },
        };
    }

    // ========== CLINICAL NOTES (SOAP) ==========

    async getNote(encounterId: string, clinicId: string) {
        // Validate encounter exists and belongs to clinic
        await this.findOne(encounterId, clinicId);

        const note = await this.prisma.encounterNote.findUnique({
            where: { encounterId },
            include: {
                createdBy: { select: { id: true, name: true } },
                updatedBy: { select: { id: true, name: true } },
            },
        });

        return note;
    }

    async createNote(
        encounterId: string,
        clinicId: string,
        userId: string,
        data: { subjective?: string; objective?: string; assessment?: string; plan?: string },
    ) {
        // Validate encounter exists and is OPEN
        const encounter = await this.findOne(encounterId, clinicId);

        if (encounter.status === EncounterStatus.CLOSED) {
            throw new ForbiddenException(
                'Não é possível adicionar notas a um atendimento fechado',
            );
        }

        // Check if note already exists
        const existingNote = await this.prisma.encounterNote.findUnique({
            where: { encounterId },
        });

        if (existingNote) {
            throw new ConflictException('Nota já existe para este atendimento');
        }

        // Create note
        const note = await this.prisma.encounterNote.create({
            data: {
                encounterId,
                clinicId,
                createdById: userId,
                subjective: data.subjective,
                objective: data.objective,
                assessment: data.assessment,
                plan: data.plan,
            },
        });

        // Audit log
        await this.auditService.log({
            clinicId,
            userId,
            action: AuditAction.CREATE,
            entity: 'EncounterNote',
            entityId: note.id,
            message: 'encounter.note.created',
        });

        return note;
    }

    async updateNote(
        encounterId: string,
        clinicId: string,
        userId: string,
        data: { subjective?: string; objective?: string; assessment?: string; plan?: string },
    ) {
        // Validate encounter exists and is OPEN
        const encounter = await this.findOne(encounterId, clinicId);

        if (encounter.status === EncounterStatus.CLOSED) {
            throw new ForbiddenException(
                'Não é possível editar notas de um atendimento fechado',
            );
        }

        // Find existing note
        const existingNote = await this.prisma.encounterNote.findUnique({
            where: { encounterId },
        });

        if (!existingNote) {
            throw new NotFoundException('Nota não encontrada');
        }

        // Update note
        const note = await this.prisma.encounterNote.update({
            where: { encounterId },
            data: {
                subjective: data.subjective,
                objective: data.objective,
                assessment: data.assessment,
                plan: data.plan,
                updatedById: userId,
            },
        });

        // Audit log
        await this.auditService.log({
            clinicId,
            userId,
            action: AuditAction.UPDATE,
            entity: 'EncounterNote',
            entityId: note.id,
            message: 'encounter.note.updated',
        });

        return note;
    }
}
