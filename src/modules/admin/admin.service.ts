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

    async updateUser(id: string, data: { isActive?: boolean; password?: string; isSuperAdmin?: boolean; clinicRoles?: { clinicId: string; roleId: string }[] }) {
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
            if (data.clinicRoles) {
                // Determine current links
                const current = await tx.clinicUser.findMany({
                    where: { userId: id },
                    select: { clinicId: true, roleId: true }
                });

                const incomingClinicIds = data.clinicRoles.map(cr => cr.clinicId);
                const currentClinicIds = current.map(c => c.clinicId);

                // Identify removals
                const toRemove = currentClinicIds.filter(cid => !incomingClinicIds.includes(cid));
                if (toRemove.length > 0) {
                    await tx.clinicUser.deleteMany({
                        where: {
                            userId: id,
                            clinicId: { in: toRemove }
                        }
                    });
                }

                // Identify upserts (new or inconsistent role)
                for (const item of data.clinicRoles) {
                    const existing = current.find(c => c.clinicId === item.clinicId);

                    if (!existing) {
                        // Create
                        await tx.clinicUser.create({
                            data: {
                                userId: id,
                                clinicId: item.clinicId,
                                roleId: item.roleId,
                                active: true
                            }
                        });
                    } else if (existing.roleId !== item.roleId) {
                        // Update Role
                        await tx.clinicUser.update({
                            where: {
                                clinicId_userId: {
                                    clinicId: item.clinicId,
                                    userId: id
                                }
                            },
                            data: { roleId: item.roleId }
                        });
                    }
                }
            }

            return user;
        });
    }

    async createUser(data: { name: string; email: string; password?: string; isSuperAdmin?: boolean; clinicId?: string; roleId?: string }) {
        const password = await bcrypt.hash(data.password || '123456', 10);

        return this.prisma.$transaction(async (tx) => {
            // 1. Create User
            const user = await tx.user.create({
                data: {
                    name: data.name,
                    email: data.email,
                    password,
                    isSuperAdmin: data.isSuperAdmin || false,
                    isActive: true,
                },
            });

            // 2. Link to Clinic if provided
            if (data.clinicId && data.roleId) {
                // Check if roleId is key or ID
                let finalRoleId = data.roleId;
                const roleByKey = await tx.role.findFirst({ where: { key: data.roleId } });
                if (roleByKey) {
                    finalRoleId = roleByKey.id;
                }

                await tx.clinicUser.create({
                    data: {
                        userId: user.id,
                        clinicId: data.clinicId,
                        roleId: finalRoleId,
                        active: true,
                    },
                });
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

    async getRoles() {
        return this.prisma.role.findMany({
            orderBy: { name: 'asc' },
            include: {
                rolePermissions: {
                    include: { permission: true }
                },
                _count: {
                    select: { rolePermissions: true, clinicUsers: true }
                }
            }
        });
    }

    async getRole(id: string) {
        return this.prisma.role.findUnique({
            where: { id },
            include: {
                rolePermissions: {
                    include: { permission: true }
                },
                _count: {
                    select: { clinicUsers: true }
                }
            }
        });
    }

    async createRole(data: { key: string; name: string; description?: string }) {
        return this.prisma.role.create({
            data: {
                key: data.key,
                name: data.name,
                description: data.description,
            }
        });
    }

    async updateRole(id: string, data: { name?: string; description?: string; permissionKeys?: string[] }) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Update basic fields
            const role = await tx.role.update({
                where: { id },
                data: {
                    ...(data.name && { name: data.name }),
                    ...(data.description !== undefined && { description: data.description }),
                }
            });

            // 2. Update permissions if provided
            if (data.permissionKeys) {
                // Get all permission IDs for these keys
                const permissions = await tx.permission.findMany({
                    where: { key: { in: data.permissionKeys } },
                    select: { id: true }
                });

                // Wipe existing
                await tx.rolePermission.deleteMany({ where: { roleId: id } });

                // Create new
                if (permissions.length > 0) {
                    await tx.rolePermission.createMany({
                        data: permissions.map(p => ({
                            roleId: id,
                            permissionId: p.id
                        }))
                    });
                }
            }

            return role;
        });
    }

    async deleteRole(id: string) {
        // Check usage
        const usage = await this.prisma.clinicUser.count({ where: { roleId: id } });
        if (usage > 0) {
            throw new Error('Role is in use by active users');
        }

        return this.prisma.role.delete({ where: { id } });
    }

    async getAllPermissions() {
        return this.prisma.permission.findMany({
            orderBy: { key: 'asc' }
        });
    }
}

