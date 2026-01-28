import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ProfessionalsService, CreateProfessionalDto, UpdateProfessionalDto, InviteProfessionalDto } from './professionals.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';

/**
 * Professionals Controller
 *
 * ⚠️ ADMINISTRATIVE ENDPOINTS
 * All endpoints are intended for clinic administrators only.
 */
@Controller('professionals')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ProfessionalsController {
    constructor(private professionalsService: ProfessionalsService) { }

    @Get('users')
    @Permissions(PERMISSIONS.ROLE_READ)
    async getAllClinicUsers(@Request() req: any) {
        const clinicId = req.clinicId;
        return this.professionalsService.getAllClinicUsers(clinicId);
    }

    @Get()
    @Permissions(PERMISSIONS.PROFESSIONAL_READ)
    async getProfessionals(@Request() req: any) {
        const clinicId = req.clinicId;
        return this.professionalsService.getProfessionals(clinicId);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Permissions(PERMISSIONS.PROFESSIONAL_MANAGE)
    async createProfessional(
        @Request() req: any,
        @Body() dto: CreateProfessionalDto,
    ) {
        const clinicId = req.clinicId;
        return this.professionalsService.createProfessional(clinicId, dto.userId);
    }

    /**
     * POST /professionals/invite
     * Invite a new professional (creates user if needed)
     */
    @Post('invite')
    @HttpCode(HttpStatus.CREATED)
    @Permissions(PERMISSIONS.PROFESSIONAL_MANAGE)
    async inviteProfessional(
        @Request() req: any,
        @Body() dto: InviteProfessionalDto,
    ) {
        const clinicId = req.clinicId;
        const currentUserId = req.user?.id;
        return this.professionalsService.inviteProfessional(clinicId, currentUserId, dto);
    }

    /**
     * PATCH /professionals/:userId
     * Update professional data (specialty, color)
     */
    @Patch(':userId')
    @Permissions(PERMISSIONS.PROFESSIONAL_MANAGE)
    async updateProfessional(
        @Request() req: any,
        @Param('userId') userId: string,
        @Body() dto: UpdateProfessionalDto,
    ) {
        const clinicId = req.clinicId;
        const currentUserId = req.user?.id;
        return this.professionalsService.updateProfessional(clinicId, userId, currentUserId, dto);
    }

    @Patch(':userId/activate')
    @Permissions(PERMISSIONS.PROFESSIONAL_MANAGE)
    async activateProfessional(
        @Request() req: any,
        @Param('userId') userId: string,
    ) {
        const clinicId = req.clinicId;
        const currentUserId = req.user?.id;
        return this.professionalsService.activateProfessional(clinicId, userId, currentUserId);
    }

    @Patch(':userId/deactivate')
    @Permissions(PERMISSIONS.PROFESSIONAL_MANAGE)
    async deactivateProfessional(
        @Request() req: any,
        @Param('userId') userId: string,
    ) {
        const clinicId = req.clinicId;
        const currentUserId = req.user?.id;
        return this.professionalsService.deactivateProfessional(clinicId, userId, currentUserId);
    }

    /**
     * PUT /professionals/:userId/role
     * Update user role
     */
    @Put(':userId/role')
    @Permissions(PERMISSIONS.ROLE_MANAGE)
    async updateUserRole(
        @Request() req: any,
        @Param('userId') userId: string,
        @Body() body: { roleId: string },
    ) {
        const clinicId = req.clinicId;
        const currentUserId = req.user?.id;
        return this.professionalsService.updateUserRole(clinicId, userId, body.roleId, currentUserId);
    }

    @Delete(':userId')
    @Permissions(PERMISSIONS.PROFESSIONAL_MANAGE)
    async removeProfessional(
        @Request() req: any,
        @Param('userId') userId: string,
    ) {
        const clinicId = req.clinicId;
        const currentUserId = req.user.id;
        return this.professionalsService.removeProfessional(clinicId, userId, currentUserId);
    }

    /**
     * GET /professionals/:userId/working-hours
     * Get professional's working hours
     */
    @Get(':userId/working-hours')
    @Permissions(PERMISSIONS.PROFESSIONAL_READ)
    async getWorkingHours(
        @Request() req: any,
        @Param('userId') userId: string,
    ) {
        const clinicId = req.clinicId;
        return this.professionalsService.getWorkingHours(clinicId, userId);
    }

    /**
     * PUT /professionals/:userId/working-hours
     * Update professional's working hours
     */
    @Put(':userId/working-hours')
    @Permissions(PERMISSIONS.PROFESSIONAL_MANAGE)
    async updateWorkingHours(
        @Request() req: any,
        @Param('userId') userId: string,
        @Body() hours: Array<{
            dayOfWeek: number;
            isOpen: boolean;
            startTime?: string;
            endTime?: string;
        }>,
    ) {
        const clinicId = req.clinicId;
        const currentUserId = req.user?.id;
        return this.professionalsService.updateWorkingHours(clinicId, userId, currentUserId, hours);
    }
}

