import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class RolesService {
    constructor(private prisma: PrismaService) { }

    /**
     * List all roles with their permissions
     */
    async findAll() {
        return this.prisma.role.findMany({
            include: {
                rolePermissions: {
                    include: {
                        permission: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Get a single role with permissions
     */
    async findOne(id: string) {
        return this.prisma.role.findUnique({
            where: { id },
            include: {
                rolePermissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });
    }

    /**
     * List all permissions
     */
    async findAllPermissions() {
        return this.prisma.permission.findMany({
            orderBy: { key: 'asc' },
        });
    }

    /**
     * Update permissions for a role
     */
    async updatePermissions(roleId: string, permissionIds: string[]) {
        // Delete existing permissions
        await this.prisma.rolePermission.deleteMany({
            where: { roleId },
        });

        // Create new permissions
        if (permissionIds.length > 0) {
            await this.prisma.rolePermission.createMany({
                data: permissionIds.map((permissionId) => ({
                    roleId,
                    permissionId,
                })),
            });
        }

        // Return updated role
        return this.findOne(roleId);
    }
}
