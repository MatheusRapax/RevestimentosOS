import {
    Controller,
    Post,
    Get,
    Body,
    UseGuards,
    Request,
    ForbiddenException,
} from '@nestjs/common';
import { ClinicsService } from './clinics.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';

@Controller('clinics')
@UseGuards(JwtAuthGuard)
export class ClinicsController {
    constructor(private clinicsService: ClinicsService) { }

    @Post()
    async createClinic(@Body() createClinicDto: CreateClinicDto, @Request() req: any) {
        return this.clinicsService.createClinic(createClinicDto, req.user.id);
    }

    @Get('my')
    async getMyClinics(@Request() req: any) {
        return this.clinicsService.getUserClinics(req.user.id);
    }

    @Get('context')
    async getContext(@Request() req: any) {
        const clinicId = req.clinicId;

        if (!clinicId) {
            throw new ForbiddenException(
                'Nenhuma clínica selecionada. Use o header X-Clinic-Id',
            );
        }

        // Validar acesso do usuário à clínica
        const hasAccess = await this.clinicsService.validateUserClinicAccess(
            req.user.id,
            clinicId,
        );

        if (!hasAccess) {
            throw new ForbiddenException('Você não tem acesso a esta clínica');
        }

        const clinic = await this.clinicsService.getClinicById(clinicId);

        return {
            userId: req.user.id,
            clinicId: clinic.id,
            clinicName: clinic.name,
            clinicSlug: clinic.slug,
        };
    }

    // DEPRECATED: Use GET /professionals instead
    // @Get('users')
    // async getClinicUsers(@Request() req: any) {
    //     const userClinics = await this.clinicsService.getUserClinics(req.user.id);
    //     if (!userClinics || userClinics.length === 0) {
    //         return [];
    //     }
    //     const clinicId = userClinics[0].id;
    //     return this.clinicsService.getClinicUsers(clinicId);
    // }

    @Get('admin-only')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.CLINIC_SETTINGS_MANAGE)
    async adminOnly(@Request() req: any) {
        return {
            message: 'Acesso permitido! Você é um administrador.',
            userId: req.user.id,
            clinicId: req.clinicId,
        };
    }

    @Get('reception-only')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.APPOINTMENT_CREATE)
    async receptionOnly(@Request() req: any) {
        return {
            message: 'Acesso permitido! Você pode criar agendamentos.',
            userId: req.user.id,
            clinicId: req.clinicId,
        };
    }
}

