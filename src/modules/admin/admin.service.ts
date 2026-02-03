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
                _count: {
                    select: {
                        clinicUsers: true,
                    }
                }
            }
        });
    }

    async updateUser(id: string, data: { isActive?: boolean; password?: string; isSuperAdmin?: boolean }) {
        const updateData: any = {};

        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        if (data.isSuperAdmin !== undefined) updateData.isSuperAdmin = data.isSuperAdmin;
        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, 10);
        }

        return this.prisma.user.update({
            where: { id },
            data: updateData,
            select: { id: true, email: true, name: true, isActive: true, isSuperAdmin: true },
        });
    }
}
