import { Controller, Get, Post, Patch, Body, Param, UseGuards, UseInterceptors, UploadedFile, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { SuperAdminGuard } from '../../core/auth/guards/super-admin.guard';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('tenants')
    async getTenants() {
        return this.adminService.getTenants();
    }

    @Post('tenants')
    async createTenant(@Body() data: CreateTenantDto) {
        return this.adminService.createTenant(data);
    }

    @Patch('tenants/:id')
    async updateTenant(@Param('id') id: string, @Body() data: UpdateTenantDto) {
        return this.adminService.updateTenant(id, data);
    }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                return cb(null, `${randomName}${extname(file.originalname)}`);
            }
        })
    }))
    uploadLogo(@UploadedFile() file: any) {
        // Return full URL assuming backend is on port 3001
        // In production, this should be configured via env
        const baseUrl = process.env.API_URL || 'http://localhost:3001';
        return { url: `${baseUrl}/uploads/${file.filename}` };
    }

    @Get('users')
    async getUsers(@Query('search') search?: string) {
        return this.adminService.getUsers({ search });
    }

    @Post('users')
    async createUser(@Body() body: { name: string; email: string; password?: string; isSuperAdmin?: boolean; clinicId?: string; roleId?: string }) {
        return this.adminService.createUser(body);
    }

    @Patch('users/:id')
    async updateUser(
        @Param('id') id: string,
        @Body() body: { isActive?: boolean; password?: string; isSuperAdmin?: boolean; clinicRoles?: { clinicId: string; roleId: string }[] }
    ) {
        return this.adminService.updateUser(id, body);
    }

    @Get('stats')
    async getStats() {
        return this.adminService.getDashboardStats();
    }

    @Get('audit')
    async getAudit(
        @Query('clinicId') clinicId?: string,
        @Query('userId') userId?: string,
        @Query('action') action?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.adminService.getAuditLogs({
            clinicId,
            userId,
            action,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
        });
    }
}
