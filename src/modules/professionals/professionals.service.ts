import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { AuditAction } from '@prisma/client';
import { IsUUID, IsEmail, IsString, IsOptional } from 'class-validator';
import * as bcrypt from 'bcrypt';

// DTO for professional list response
export interface ProfessionalDTO {
    id: string;
    name: string;
    email: string;
    active: boolean;
    specialtyId?: string;
    specialtyName?: string;
    color?: string;
}

// DTO for creating professional with existing user
export class CreateProfessionalDto {
    @IsUUID()
    userId: string;
}

// DTO for inviting new professional
export class InviteProfessionalDto {
    @IsEmail()
    email: string;

    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    specialtyId?: string;

    @IsOptional()
    @IsString()
    color?: string;
}

// DTO for updating professional
export interface UpdateProfessionalDto {
    specialtyId?: string;
    color?: string;
}

// DTO for operation results
export interface OperationResultDto {
    success: boolean;
    message?: string;
}


@Injectable()
export class ProfessionalsService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
    ) { }

    async getProfessionals(clinicId: string): Promise<ProfessionalDTO[]> {
        const clinicUsers = await this.prisma.clinicUser.findMany({
            where: {
                clinicId,
                // ⚠️ CRITICAL: Filter by PROFESSIONAL role only
                // This prevents returning admins, receptionists, etc.
                role: {
                    key: 'PROFESSIONAL',
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                role: {
                    select: {
                        key: true,
                        name: true,
                    },
                },
                specialty: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // Centralized DTO mapping
        return clinicUsers.map(cu => this.mapToDTO(cu));
    }

    /**
     * Get all clinic users (all roles) for user management page
     */
    async getAllClinicUsers(clinicId: string) {
        const clinicUsers = await this.prisma.clinicUser.findMany({
            where: { clinicId },
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
                role: {
                    select: { id: true, key: true, name: true },
                },
            },
            orderBy: { user: { name: 'asc' } },
        });

        return clinicUsers.map(cu => ({
            id: cu.user.id,
            name: cu.user.name,
            email: cu.user.email,
            active: cu.active,
            roleId: cu.role.id,
            roleKey: cu.role.key,
            roleName: cu.role.name,
        }));
    }

    async createProfessional(
        clinicId: string,
        userId: string,
    ): Promise<ProfessionalDTO> {
        // 1. Validate user exists
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // 2. Check if already in clinic
        // Note: A user can only have ONE role per clinic (enforced by @@unique([clinicId, userId]))
        const existing = await this.prisma.clinicUser.findFirst({
            where: { clinicId, userId },
        });

        if (existing) {
            throw new ConflictException('User already assigned to this clinic');
        }

        // 3. Get PROFESSIONAL role
        const professionalRole = await this.prisma.role.findUnique({
            where: { key: 'PROFESSIONAL' },
        });

        if (!professionalRole) {
            throw new NotFoundException('PROFESSIONAL role not found');
        }

        // 4. Create ClinicUser
        const clinicUser = await this.prisma.clinicUser.create({
            data: {
                clinicId,
                userId,
                roleId: professionalRole.id,
                active: true,
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true },
                },
                role: {
                    select: { key: true, name: true },
                },
            },
        });

        return this.mapToDTO(clinicUser);
    }

    async inviteProfessional(
        clinicId: string,
        currentUserId: string,
        dto: InviteProfessionalDto,
    ): Promise<ProfessionalDTO> {
        // 1. Check if user with email already exists
        let user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (user) {
            // User exists - check if already in clinic
            const existing = await this.prisma.clinicUser.findFirst({
                where: { clinicId, userId: user.id },
            });

            if (existing) {
                throw new ConflictException('Usuário já está vinculado a esta clínica');
            }
        } else {
            // Create new user with temporary password
            const tempPassword = Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(tempPassword, 10);

            user = await this.prisma.user.create({
                data: {
                    email: dto.email,
                    name: dto.name,
                    password: hashedPassword,
                    isActive: true,
                },
            });
        }

        // 2. Get PROFESSIONAL role
        const professionalRole = await this.prisma.role.findUnique({
            where: { key: 'PROFESSIONAL' },
        });

        if (!professionalRole) {
            throw new NotFoundException('PROFESSIONAL role not found');
        }

        // 3. Create ClinicUser with specialty and color
        const clinicUser = await this.prisma.clinicUser.create({
            data: {
                clinicId,
                userId: user.id,
                roleId: professionalRole.id,
                specialtyId: dto.specialtyId || null,
                color: dto.color || null,
                active: true,
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                specialty: { select: { id: true, name: true } },
            },
        });

        // 4. Audit log
        await this.auditService.log({
            clinicId,
            userId: currentUserId,
            action: AuditAction.CREATE,
            entity: 'Professional',
            entityId: user.id,
            message: `Profissional convidado: ${user.email}`,
        });

        return this.mapToDTO(clinicUser);
    }

    async activateProfessional(
        clinicId: string,
        userId: string,
        currentUserId: string,
    ): Promise<OperationResultDto> {
        // Find professional in current clinic (including inactive ones for activation)
        const clinicUser = await this.findProfessionalInClinic(clinicId, userId, false);

        await this.prisma.clinicUser.update({
            where: { id: clinicUser.id },
            data: { active: true },
        });

        // Audit log
        await this.auditService.log({
            clinicId,
            userId: currentUserId,
            action: AuditAction.UPDATE,
            entity: 'Professional',
            entityId: userId,
            message: 'Professional activated',
        });

        return { success: true };
    }

    async deactivateProfessional(
        clinicId: string,
        userId: string,
        currentUserId: string,
    ): Promise<OperationResultDto> {
        const clinicUser = await this.findProfessionalInClinic(clinicId, userId);

        await this.prisma.clinicUser.update({
            where: { id: clinicUser.id },
            data: { active: false },
        });

        // Audit log
        await this.auditService.log({
            clinicId,
            userId: currentUserId,
            action: AuditAction.UPDATE,
            entity: 'Professional',
            entityId: userId,
            message: 'Professional deactivated',
        });

        return { success: true };
    }

    async removeProfessional(
        clinicId: string,
        userId: string,
        currentUserId: string,
    ): Promise<OperationResultDto> {
        // Prevent self-removal (admin lockout protection)
        if (userId === currentUserId) {
            throw new ForbiddenException(
                'You cannot remove yourself from the clinic',
            );
        }

        const clinicUser = await this.findProfessionalInClinic(clinicId, userId);

        // Soft delete: set active = false instead of physical delete
        // This preserves historical data and appointment/encounter references
        await this.prisma.clinicUser.update({
            where: { id: clinicUser.id },
            data: { active: false },
        });

        return { success: true };
    }

    // Helper method
    // ⚠️ NAMING: Uses userId, not professionalId
    // The :userId param in routes is actually User.id, not ClinicUser.id
    private async findProfessionalInClinic(
        clinicId: string,
        userId: string,
        activeOnly: boolean = true,
    ) {
        const where: any = {
            clinicId,
            userId,
            role: { key: 'PROFESSIONAL' },
        };

        if (activeOnly) {
            where.active = true;
        }

        const clinicUser = await this.prisma.clinicUser.findFirst({ where });

        if (!clinicUser) {
            throw new NotFoundException(
                'Professional not found in this clinic',
            );
        }

        return clinicUser;
    }

    private mapToDTO(clinicUser: any): ProfessionalDTO {
        return {
            id: clinicUser.user.id,
            name: clinicUser.user.name,
            email: clinicUser.user.email,
            active: clinicUser.active,
            specialtyId: clinicUser.specialtyId,
            specialtyName: clinicUser.specialty?.name,
            color: clinicUser.color,
        };
    }

    async updateProfessional(
        clinicId: string,
        userId: string,
        currentUserId: string,
        dto: UpdateProfessionalDto,
    ): Promise<ProfessionalDTO> {
        const clinicUser = await this.findProfessionalInClinic(clinicId, userId, false);

        // Validate specialty if provided
        if (dto.specialtyId) {
            const specialty = await this.prisma.specialty.findFirst({
                where: { id: dto.specialtyId, clinicId, isActive: true },
            });
            if (!specialty) {
                throw new NotFoundException('Especialidade não encontrada');
            }
        }

        const updated = await this.prisma.clinicUser.update({
            where: { id: clinicUser.id },
            data: {
                specialtyId: dto.specialtyId,
                color: dto.color,
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                specialty: { select: { id: true, name: true } },
            },
        });

        await this.auditService.log({
            clinicId,
            userId: currentUserId,
            action: AuditAction.UPDATE,
            entity: 'Professional',
            entityId: userId,
            message: 'Professional updated',
        });

        return this.mapToDTO(updated);
    }

    /**
     * Update the role of a clinic user
     */
    async updateUserRole(
        clinicId: string,
        userId: string,
        roleId: string,
        currentUserId: string,
    ): Promise<{ success: boolean; roleName: string }> {
        // Find the clinic user (any role)
        const clinicUser = await this.prisma.clinicUser.findFirst({
            where: { clinicId, userId },
        });

        if (!clinicUser) {
            throw new NotFoundException('Usuário não encontrado nesta clínica');
        }

        // Validate role exists
        const role = await this.prisma.role.findUnique({
            where: { id: roleId },
        });

        if (!role) {
            throw new NotFoundException('Papel não encontrado');
        }

        // Can't change own role (protection)
        if (userId === currentUserId) {
            throw new ForbiddenException('Você não pode alterar seu próprio papel');
        }

        // Update
        await this.prisma.clinicUser.update({
            where: { id: clinicUser.id },
            data: { roleId },
        });

        // Audit log
        await this.auditService.log({
            clinicId,
            userId: currentUserId,
            action: AuditAction.UPDATE,
            entity: 'ClinicUser',
            entityId: userId,
            message: `Role changed to ${role.name}`,
        });

        return { success: true, roleName: role.name };
    }

    // ===== WORKING HOURS =====

    async getWorkingHours(clinicId: string, userId: string) {
        // Validate professional exists
        await this.findProfessionalInClinic(clinicId, userId, false);

        const hours = await this.prisma.professionalWorkingHours.findMany({
            where: { clinicId, userId },
            orderBy: { dayOfWeek: 'asc' },
        });

        // Return all 7 days, filling defaults for missing ones
        const days = [0, 1, 2, 3, 4, 5, 6];
        return days.map(dayOfWeek => {
            const existing = hours.find(h => h.dayOfWeek === dayOfWeek);
            if (existing) {
                return {
                    dayOfWeek,
                    isOpen: existing.isOpen,
                    startTime: existing.startTime,
                    endTime: existing.endTime,
                };
            }
            // Default: weekdays 08:00-18:00, weekends closed
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            return {
                dayOfWeek,
                isOpen: !isWeekend,
                startTime: isWeekend ? null : '08:00',
                endTime: isWeekend ? null : '18:00',
            };
        });
    }

    async updateWorkingHours(
        clinicId: string,
        userId: string,
        currentUserId: string,
        hours: Array<{
            dayOfWeek: number;
            isOpen: boolean;
            startTime?: string;
            endTime?: string;
        }>,
    ) {
        // Validate professional exists
        await this.findProfessionalInClinic(clinicId, userId, false);

        // Upsert each day
        for (const day of hours) {
            await this.prisma.professionalWorkingHours.upsert({
                where: {
                    clinicId_userId_dayOfWeek: {
                        clinicId,
                        userId,
                        dayOfWeek: day.dayOfWeek,
                    },
                },
                update: {
                    isOpen: day.isOpen,
                    startTime: day.startTime || null,
                    endTime: day.endTime || null,
                },
                create: {
                    clinicId,
                    userId,
                    dayOfWeek: day.dayOfWeek,
                    isOpen: day.isOpen,
                    startTime: day.startTime || null,
                    endTime: day.endTime || null,
                },
            });
        }

        // Audit log
        await this.auditService.log({
            clinicId,
            userId: currentUserId,
            action: AuditAction.UPDATE,
            entity: 'ProfessionalWorkingHours',
            entityId: userId,
            message: 'Horários de atendimento atualizados',
        });

        return this.getWorkingHours(clinicId, userId);
    }
}
