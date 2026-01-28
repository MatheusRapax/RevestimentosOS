import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { ListAppointmentDto } from './dto/list-appointment.dto';
import { AppointmentStatus, AuditAction } from '@prisma/client';

@Injectable()
export class SchedulingService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
    ) { }

    async create(clinicId: string, createAppointmentDto: CreateAppointmentDto) {
        const { patientId, professionalId, startAt, endAt, room, notes } =
            createAppointmentDto;

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

        // Validate dates
        const start = new Date(startAt);
        const end = new Date(endAt);

        if (end <= start) {
            throw new BadRequestException(
                'Data de término deve ser posterior à data de início',
            );
        }

        // Check for conflicts
        await this.validateConflict(clinicId, professionalId, start, end);

        // Check for blocking schedule
        await this.validateScheduleBlock(clinicId, professionalId, start, end);

        // Check working hours (clinic)
        const startTimeStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
        const endTimeStr = `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
        const { outsideHours, reason } = await this.isOutsideWorkingHours(clinicId, start, startTimeStr, endTimeStr);
        if (outsideHours) {
            throw new ForbiddenException(reason || 'Fora do horário de funcionamento');
        }

        // Check professional working hours
        await this.validateProfessionalWorkingHours(clinicId, professionalId, start, startTimeStr, endTimeStr);

        // Create appointment
        const appointment = await this.prisma.appointment.create({
            data: {
                clinicId,
                patientId,
                professionalId,
                startAt: start,
                endAt: end,
                room,
                notes,
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
                        email: true,
                    },
                },
            },
        });

        // Audit log
        await this.auditService.log({
            clinicId,
            action: AuditAction.CREATE,
            entity: 'Appointment',
            entityId: appointment.id,
            message: 'appointment.created',
        });

        return appointment;
    }

    async findAll(clinicId: string, filters: ListAppointmentDto) {
        const { startDate, endDate, professionalId } = filters;

        // Parse date string as local time (YYYY-MM-DD format)
        // Append time to force local timezone interpretation
        const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
        const startOfDay = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);

        const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
        const endOfDay = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

        const where: any = {
            clinicId,
            startAt: {
                gte: startOfDay,
                lte: endOfDay,
            },
        };

        if (professionalId) {
            where.professionalId = professionalId;
        }

        return this.prisma.appointment.findMany({
            where,
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
                        email: true,
                    },
                },
            },
            orderBy: {
                startAt: 'asc',
            },
        });
    }

    async findOne(id: string, clinicId: string) {
        const appointment = await this.prisma.appointment.findFirst({
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
                    },
                },
                professional: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!appointment) {
            throw new NotFoundException('Agendamento não encontrado');
        }

        return appointment;
    }

    async update(
        id: string,
        clinicId: string,
        updateAppointmentDto: UpdateAppointmentDto,
    ) {
        // Verify appointment exists and belongs to clinic
        await this.findOne(id, clinicId);

        const { startAt, endAt, professionalId, ...rest } = updateAppointmentDto;

        // If rescheduling, revalidate conflicts
        if (startAt || endAt) {
            const appointment = await this.prisma.appointment.findUnique({
                where: { id },
            });

            if (!appointment) { throw new NotFoundException("Agendamento não encontrado"); }
            const newStart = startAt ? new Date(startAt) : appointment.startAt;
            const newEnd = endAt ? new Date(endAt) : appointment.endAt;
            const newProfessionalId = professionalId || appointment.professionalId;

            if (newEnd <= newStart) {
                throw new BadRequestException(
                    'Data de término deve ser posterior à data de início',
                );
            }

            await this.validateConflict(
                clinicId,
                newProfessionalId,
                newStart,
                newEnd,
                id,
            );
        }

        const updated = await this.prisma.appointment.update({
            where: { id },
            data: {
                ...rest,
                startAt: startAt ? new Date(startAt) : undefined,
                endAt: endAt ? new Date(endAt) : undefined,
                professionalId,
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
                        email: true,
                    },
                },
            },
        });

        return updated;
    }

    async checkIn(id: string, clinicId: string) {
        const current = await this.findOne(id, clinicId);

        // Validate status transition
        const validFromStatuses = ['SCHEDULED', 'CONFIRMED'];
        if (!validFromStatuses.includes(current.status)) {
            throw new BadRequestException(
                `Check-in não permitido para agendamentos com status ${current.status}`,
            );
        }

        const appointment = await this.prisma.appointment.update({
            where: { id },
            data: {
                status: AppointmentStatus.CHECKED_IN,
            },
        });

        // Audit log
        await this.auditService.log({
            clinicId,
            action: AuditAction.UPDATE,
            entity: 'Appointment',
            entityId: id,
            message: 'appointment.checked_in',
        });

        return appointment;
    }

    async cancel(id: string, clinicId: string) {
        const appointment = await this.findOne(id, clinicId);

        // Validate status - can't cancel terminal states
        const terminalStatuses = ['COMPLETED', 'CANCELLED', 'NO_SHOW'];
        if (terminalStatuses.includes(appointment.status)) {
            throw new BadRequestException(
                `Não é possível cancelar um agendamento com status ${appointment.status}`,
            );
        }

        const cancelled = await this.prisma.appointment.update({
            where: { id },
            data: {
                status: AppointmentStatus.CANCELLED,
            },
        });

        // Audit log
        await this.auditService.log({
            clinicId,
            action: AuditAction.UPDATE,
            entity: 'Appointment',
            entityId: id,
            message: 'appointment.cancelled',
        });

        return cancelled;
    }

    private async validateConflict(
        clinicId: string,
        professionalId: string,
        startAt: Date,
        endAt: Date,
        excludeId?: string,
    ) {
        const conflict = await this.prisma.appointment.findFirst({
            where: {
                clinicId,
                professionalId,
                id: excludeId ? { not: excludeId } : undefined,
                status: {
                    notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
                },
                AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
            },
        });

        if (conflict) {
            throw new ConflictException(
                `Conflito de horário detectado. O profissional já possui um agendamento entre ${conflict.startAt.toLocaleString()} e ${conflict.endAt.toLocaleString()}`,
            );
        }
    }

    /**
     * Validates that the appointment doesn't fall within a schedule block
     */
    private async validateScheduleBlock(
        clinicId: string,
        professionalId: string,
        startAt: Date,
        endAt: Date,
    ) {
        // Extract date string (YYYY-MM-DD) and time strings (HH:MM)
        const dateStr = `${startAt.getFullYear()}-${(startAt.getMonth() + 1).toString().padStart(2, '0')}-${startAt.getDate().toString().padStart(2, '0')}`;
        const startTime = `${startAt.getHours().toString().padStart(2, '0')}:${startAt.getMinutes().toString().padStart(2, '0')}`;
        const endTime = `${endAt.getHours().toString().padStart(2, '0')}:${endAt.getMinutes().toString().padStart(2, '0')}`;

        // Find blocking scheduleBlock (only active ones)
        const block = await this.prisma.scheduleBlock.findFirst({
            where: {
                clinicId,
                date: dateStr,
                isActive: true,
                OR: [
                    // Clinic-wide block
                    { professionalId: null },
                    // Professional-specific block
                    { professionalId },
                ],
            },
        });

        if (block) {
            // Full day block (no startTime/endTime)
            if (!block.startTime || !block.endTime) {
                throw new ForbiddenException(
                    block.reason || 'Este dia está bloqueado na agenda',
                );
            }

            // Time range block - check overlap
            const blockStart = block.startTime;
            const blockEnd = block.endTime;

            // Overlap check: appointment starts before block ends AND appointment ends after block starts
            if (startTime < blockEnd && endTime > blockStart) {
                throw new ForbiddenException(
                    block.reason || `Horário bloqueado (${blockStart} - ${blockEnd})`,
                );
            }
        }
    }

    /**
     * Validate professional working hours
     * Checks if appointment is within professional's configured working hours
     */
    private async validateProfessionalWorkingHours(
        clinicId: string,
        professionalId: string,
        appointmentDate: Date,
        startTime: string,
        endTime: string,
    ) {
        const dayOfWeek = appointmentDate.getDay(); // 0=Sunday, 1=Monday, etc.

        // Get professional's working hours for this day
        const workingHours = await this.prisma.professionalWorkingHours.findUnique({
            where: {
                clinicId_userId_dayOfWeek: {
                    clinicId,
                    userId: professionalId,
                    dayOfWeek,
                },
            },
        });

        // If no config exists, use default (Mon-Fri 08:00-18:00, Sat-Sun closed)
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isOpen = workingHours?.isOpen ?? !isWeekend;
        const profStartTime = workingHours?.startTime ?? (isWeekend ? null : '08:00');
        const profEndTime = workingHours?.endTime ?? (isWeekend ? null : '18:00');

        if (!isOpen) {
            const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            throw new ForbiddenException(
                `Profissional não atende às ${dayNames[dayOfWeek]}s`,
            );
        }

        // Check if appointment is within professional's hours
        if (profStartTime && profEndTime) {
            if (startTime < profStartTime || endTime > profEndTime) {
                throw new ForbiddenException(
                    `Profissional atende apenas das ${profStartTime} às ${profEndTime}`,
                );
            }
        }
    }

    async startEncounterFromAppointment(
        appointmentId: string,
        clinicId: string,
        dto: { notes?: string },
    ) {
        // 1. Get appointment
        const appointment = await this.prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                patient: { select: { id: true, name: true } },
                professional: { select: { id: true, name: true } },
            },
        });

        if (!appointment || appointment.clinicId !== clinicId) {
            throw new NotFoundException('Agendamento não encontrado');
        }

        // 2. Validate status
        if (!['SCHEDULED', 'CHECKED_IN'].includes(appointment.status)) {
            throw new BadRequestException(
                'Atendimento só pode ser iniciado para agendamentos com status SCHEDULED ou CHECKED_IN',
            );
        }

        // 3. Check for existing encounter
        const existingEncounter = await this.prisma.encounter.findFirst({
            where: {
                appointmentId,
                clinicId,
                status: { not: 'CLOSED' },
            },
        });

        if (existingEncounter) {
            throw new ConflictException(
                'Já existe um atendimento ativo para este agendamento',
            );
        }

        // 4. Extract date/time in local timezone (avoid UTC offset)
        const startDate = appointment.startAt;
        const year = startDate.getFullYear();
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const day = String(startDate.getDate()).padStart(2, '0');
        const hours = String(startDate.getHours()).padStart(2, '0');
        const minutes = String(startDate.getMinutes()).padStart(2, '0');

        const dateStr = `${year}-${month}-${day}`;
        const timeStr = `${hours}:${minutes}`;

        // 5. Create encounter
        const encounter = await this.prisma.encounter.create({
            data: {
                clinicId,
                patientId: appointment.patientId,
                professionalId: appointment.professionalId,
                appointmentId: appointment.id,
                date: dateStr,
                time: timeStr,
                notes: dto.notes || '',
                status: 'OPEN',
            },
            include: {
                patient: { select: { id: true, name: true } },
                professional: { select: { id: true, name: true } },
                appointment: {
                    select: { id: true, startAt: true, endAt: true },
                },
            },
        });

        // 6. Update appointment status to indicate encounter started
        await this.prisma.appointment.update({
            where: { id: appointmentId },
            data: { status: AppointmentStatus.CHECKED_IN },
        });

        return encounter;
    }

    // ========== PROFESSIONALS ==========

    async listProfessionals(clinicId: string) {
        const clinicUsers = await this.prisma.clinicUser.findMany({
            where: { clinicId },
            include: {
                user: { select: { id: true, name: true, email: true } },
            },
        });

        return clinicUsers.map((cu) => ({
            id: cu.user.id,
            name: cu.user.name,
            email: cu.user.email,
        }));
    }

    // ========== SCHEDULE BLOCKS ==========

    async listBlocks(clinicId: string, startDate: string, endDate: string) {
        return this.prisma.scheduleBlock.findMany({
            where: {
                clinicId,
                isActive: true,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                professional: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true } },
            },
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        });
    }

    async createBlock(
        clinicId: string,
        userId: string,
        data: {
            professionalId?: string;
            date: string;
            startTime?: string;
            endTime?: string;
            reason?: string;
        },
    ) {
        // Validate time range if provided
        if (data.startTime && data.endTime) {
            if (data.startTime >= data.endTime) {
                throw new BadRequestException(
                    'Hora de início deve ser anterior à hora de término',
                );
            }
        }

        // If professionalId provided, validate it belongs to clinic
        if (data.professionalId) {
            const professional = await this.prisma.clinicUser.findFirst({
                where: { userId: data.professionalId, clinicId },
            });
            if (!professional) {
                throw new NotFoundException('Profissional não encontrado');
            }
        }

        const block = await this.prisma.scheduleBlock.create({
            data: {
                clinicId,
                professionalId: data.professionalId || null,
                date: data.date,
                startTime: data.startTime || null,
                endTime: data.endTime || null,
                reason: data.reason || null,
                createdById: userId,
            },
            include: {
                professional: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true } },
            },
        });

        // Audit log
        await this.auditService.log({
            clinicId,
            userId,
            action: AuditAction.CREATE,
            entity: 'ScheduleBlock',
            entityId: block.id,
            message: 'schedule.block.created',
        });

        return block;
    }

    async deleteBlock(blockId: string, clinicId: string, userId: string) {
        const block = await this.prisma.scheduleBlock.findFirst({
            where: { id: blockId, clinicId, isActive: true },
        });

        if (!block) {
            throw new NotFoundException('Bloqueio não encontrado');
        }

        // Soft delete
        await this.prisma.scheduleBlock.update({
            where: { id: blockId },
            data: { isActive: false },
        });

        // Audit log
        await this.auditService.log({
            clinicId,
            userId,
            action: AuditAction.DELETE,
            entity: 'ScheduleBlock',
            entityId: blockId,
            message: 'schedule.block.deleted',
        });

        return { success: true };
    }

    // ========== WORKING HOURS ==========

    async getWorkingHours(clinicId: string) {
        const hours = await this.prisma.clinicWorkingHours.findMany({
            where: { clinicId },
            orderBy: { dayOfWeek: 'asc' },
        });

        // If no config exists, return empty array (UI will show all days closed)
        return hours;
    }

    async updateWorkingHours(
        clinicId: string,
        userId: string,
        data: Array<{
            dayOfWeek: number;
            isOpen: boolean;
            startTime?: string;
            endTime?: string;
        }>,
    ) {
        // Validate input
        for (const day of data) {
            if (day.dayOfWeek < 0 || day.dayOfWeek > 6) {
                throw new BadRequestException('dayOfWeek deve ser entre 0 e 6');
            }
            if (day.isOpen && (!day.startTime || !day.endTime)) {
                throw new BadRequestException('startTime e endTime são obrigatórios quando aberto');
            }
            if (day.startTime && day.endTime && day.startTime >= day.endTime) {
                throw new BadRequestException('startTime deve ser anterior ao endTime');
            }
        }

        // Upsert each day
        const results = [];
        for (const day of data) {
            const result = await this.prisma.clinicWorkingHours.upsert({
                where: {
                    clinicId_dayOfWeek: {
                        clinicId,
                        dayOfWeek: day.dayOfWeek,
                    },
                },
                update: {
                    isOpen: day.isOpen,
                    startTime: day.isOpen ? day.startTime : null,
                    endTime: day.isOpen ? day.endTime : null,
                },
                create: {
                    clinicId,
                    dayOfWeek: day.dayOfWeek,
                    isOpen: day.isOpen,
                    startTime: day.isOpen ? day.startTime : null,
                    endTime: day.isOpen ? day.endTime : null,
                },
            });
            results.push(result);
        }

        // Audit log
        await this.auditService.log({
            clinicId,
            userId,
            action: AuditAction.UPDATE,
            entity: 'ClinicWorkingHours',
            entityId: clinicId,
            message: 'clinic.working_hours.updated',
        });

        return results;
    }

    /**
     * Check if a time slot falls outside working hours
     */
    async isOutsideWorkingHours(
        clinicId: string,
        date: Date,
        startTime: string,
        endTime: string,
    ): Promise<{ outsideHours: boolean; reason?: string }> {
        const dayOfWeek = date.getDay(); // 0-6

        const workingHours = await this.prisma.clinicWorkingHours.findUnique({
            where: {
                clinicId_dayOfWeek: {
                    clinicId,
                    dayOfWeek,
                },
            },
        });

        // If no config, allow (legacy behavior - no restrictions)
        if (!workingHours) {
            return { outsideHours: false };
        }

        // Day is closed
        if (!workingHours.isOpen) {
            const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
            return {
                outsideHours: true,
                reason: `Clínica fechada às ${dayNames[dayOfWeek]}s`,
            };
        }

        // Check if appointment is within working hours
        const whStart = workingHours.startTime;
        const whEnd = workingHours.endTime;

        // If times are not configured, allow (treat as all-day open)
        if (!whStart || !whEnd) {
            return { outsideHours: false };
        }

        if (startTime < whStart || endTime > whEnd) {
            return {
                outsideHours: true,
                reason: `Fora do horário de funcionamento (${whStart} - ${whEnd})`,
            };
        }

        return { outsideHours: false };
    }
}
