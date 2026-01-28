import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    UseGuards,
    Request,
} from '@nestjs/common';
import { SpecialtiesService, CreateSpecialtyDto, UpdateSpecialtyDto } from './specialties.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';

interface AuthRequest {
    user: { id: string; email: string };
    clinicId: string;
}

@Controller('specialties')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class SpecialtiesController {
    constructor(private specialtiesService: SpecialtiesService) { }

    @Get()
    @Permissions(PERMISSIONS.SPECIALTY_READ)
    findAll(@Request() req: AuthRequest) {
        return this.specialtiesService.findAll(req.clinicId);
    }

    @Get(':id')
    @Permissions(PERMISSIONS.SPECIALTY_READ)
    findOne(@Param('id') id: string, @Request() req: AuthRequest) {
        return this.specialtiesService.findOne(id, req.clinicId);
    }

    @Post()
    @Permissions(PERMISSIONS.SPECIALTY_CREATE)
    create(@Request() req: AuthRequest, @Body() dto: CreateSpecialtyDto) {
        return this.specialtiesService.create(req.clinicId, req.user.id, dto);
    }

    @Patch(':id')
    @Permissions(PERMISSIONS.SPECIALTY_UPDATE)
    update(
        @Param('id') id: string,
        @Request() req: AuthRequest,
        @Body() dto: UpdateSpecialtyDto,
    ) {
        return this.specialtiesService.update(id, req.clinicId, req.user.id, dto);
    }

    @Delete(':id')
    @Permissions(PERMISSIONS.SPECIALTY_DELETE)
    remove(@Param('id') id: string, @Request() req: AuthRequest) {
        return this.specialtiesService.remove(id, req.clinicId, req.user.id);
    }
}
