import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) { }

    async getTenants() {
        return this.prisma.clinic.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                slug: true,
                isActive: true,
                modules: true,
                logoUrl: true,
                createdAt: true,
                _count: {
                    select: {
                        clinicUsers: true,
                    }
                }
            }
        });
    }

    async createTenant(data: CreateTenantDto) {
        return this.prisma.clinic.create({
            data: {
                name: data.name,
                slug: data.slug,
                modules: data.modules,
                logoUrl: data.logoUrl,
                isActive: true,
            },
        });
    }

    async updateTenant(id: string, data: UpdateTenantDto) {
        return this.prisma.clinic.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.slug && { slug: data.slug }),
                ...(data.modules && { modules: data.modules }),
                ...(data.logoUrl && { logoUrl: data.logoUrl }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
        });
    }

    async getUsers(query?: { search?: string }) {
        const where: any = {};
        if (query?.search) {
            where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
            ];
        }

        return this.prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
                isSuperAdmin: true,
                createdAt: true,
                clinicUsers: {
                    select: {
                        clinic: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                            }
                        },
                        role: {
                            select: {
                                key: true,
                                name: true,
                            }
                        }
                    }
                }
            }
        });
    }

    async updateUser(id: string, data: { isActive?: boolean; password?: string; isSuperAdmin?: boolean; clinicIds?: string[] }) {
        const updateData: any = {};

        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        if (data.isSuperAdmin !== undefined) updateData.isSuperAdmin = data.isSuperAdmin;
        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, 10);
        }

        // Transaction to handle fields and relations
        return this.prisma.$transaction(async (tx) => {
            // 1. Update basic fields
            const user = await tx.user.update({
                where: { id },
                data: updateData,
                select: { id: true, email: true, name: true, isActive: true, isSuperAdmin: true },
            });

            // 2. Sync Clinics if provided
            if (data.clinicIds) {
                const adminRole = await tx.role.findFirst({ where: { key: 'CLINIC_ADMIN' } });
                const roleId = adminRole?.id;

                if (roleId) {
                    const current = await tx.clinicUser.findMany({
                        where: { userId: id },
                        select: { clinicId: true }
                    });
                    const currentIds = current.map(c => c.clinicId);

                    const toAdd = data.clinicIds.filter(cid => !currentIds.includes(cid));
                    const toRemove = currentIds.filter(cid => !data.clinicIds!.includes(cid));

                    if (toRemove.length > 0) {
                        await tx.clinicUser.deleteMany({
                            where: {
                                userId: id,
                                clinicId: { in: toRemove }
                            }
                        });
                    }

                    if (toAdd.length > 0) {
                        await tx.clinicUser.createMany({
                            data: toAdd.map(clinicId => ({
                                userId: id,
                                clinicId,
                                roleId: roleId,
                            }))
                        });
                    }
                }
            }

            return user;
        });
    }

    async getDashboardStats() {
        const [
            totalClinics,
            activeClinics,
            totalUsers,
            activeUsers,
            superAdmins,
            recentLogs
        ] = await Promise.all([
            this.prisma.clinic.count(),
            this.prisma.clinic.count({ where: { isActive: true } }),
            this.prisma.user.count(),
            this.prisma.user.count({ where: { isActive: true } }),
            this.prisma.user.count({ where: { isSuperAdmin: true } }),
            this.prisma.auditLog.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { name: true, email: true } }, clinic: { select: { name: true } } }
            })
        ]);

        return {
            clinics: { total: totalClinics, active: activeClinics },
            users: { total: totalUsers, active: activeUsers, superAdmins },
            recentLogs
        };
    }

    async getAuditLogs(query?: { clinicId?: string; userId?: string; action?: string; limit?: number; offset?: number }) {
        const where: any = {};
        if (query?.clinicId) where.clinicId = query.clinicId;
        if (query?.userId) where.userId = query.userId;
        if (query?.action) where.action = query.action as any;

        const [data, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                take: query?.limit || 50,
                skip: query?.offset || 0,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { name: true, email: true } },
                    clinic: { select: { name: true, slug: true } }
                }
            }),
            this.prisma.auditLog.count({ where })
        ]);

        return { data, total };
    }
}
