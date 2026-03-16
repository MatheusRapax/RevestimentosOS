import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

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

  /**
   * Create a new role
   */
  async create(data: { name: string; description?: string }) {
    // Generate a unique key based on name
    const baseKey = data.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    let key = baseKey;
    let counter = 1;

    // Check if key exists and make it unique
    while (await this.prisma.role.findUnique({ where: { key } })) {
      key = `${baseKey}_${counter}`;
      counter++;
    }

    const role = await this.prisma.role.create({
      data: {
        name: data.name,
        key: key,
        description: data.description,
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return role;
  }
}
