import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { SuperAdminGuard } from '../../core/auth/guards/super-admin.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class RolesController {
    constructor(private readonly adminService: AdminService) { }

    @Get('permissions')
    async getPermissions() {
        return this.adminService.getAllPermissions();
    }

    @Get('roles')
    async getRoles() {
        return this.adminService.getRoles();
    }

    @Get('roles/:id')
    async getRole(@Param('id') id: string) {
        return this.adminService.getRole(id);
    }

    @Post('roles')
    async createRole(@Body() data: { key: string; name: string; description?: string }) {
        return this.adminService.createRole(data);
    }

    @Put('roles/:id')
    async updateRole(
        @Param('id') id: string,
        @Body() data: { name?: string; description?: string; permissionKeys?: string[] }
    ) {
        return this.adminService.updateRole(id, data);
    }

    @Delete('roles/:id')
    async deleteRole(@Param('id') id: string) {
        try {
            return await this.adminService.deleteRole(id);
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }
}
