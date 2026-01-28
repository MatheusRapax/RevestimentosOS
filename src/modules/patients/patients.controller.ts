import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Request,
    Query,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { ListPatientDto } from './dto/list-patient.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';

@Controller('patients')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PatientsController {
    constructor(private readonly patientsService: PatientsService) { }

    @Post()
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.PATIENT_CREATE)
    create(@Body() createPatientDto: CreatePatientDto, @Request() req: any) {
        return this.patientsService.create(req.clinicId, createPatientDto);
    }

    @Get()
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.PATIENT_READ)
    findAll(@Query() filters: ListPatientDto, @Request() req: any) {
        return this.patientsService.findAll(req.clinicId, filters);
    }

    // ========== CLINICAL RECORD v2 (must come before :id) ==========

    @Get(':id/timeline')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.PATIENT_READ)
    getTimeline(@Param('id') id: string, @Request() req: any) {
        return this.patientsService.getPatientTimeline(id, req.clinicId);
    }

    @Get(':id/summary')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.PATIENT_READ)
    getSummary(@Param('id') id: string, @Request() req: any) {
        return this.patientsService.getPatientSummary(id, req.clinicId);
    }

    // ========== BASIC CRUD ==========

    @Get(':id')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.PATIENT_READ)
    findOne(@Param('id') id: string, @Request() req: any) {
        return this.patientsService.findOne(id, req.clinicId);
    }

    @Patch(':id')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.PATIENT_UPDATE)
    update(
        @Param('id') id: string,
        @Body() updatePatientDto: UpdatePatientDto,
        @Request() req: any,
    ) {
        return this.patientsService.update(id, req.clinicId, updatePatientDto);
    }

    @Delete(':id')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.PATIENT_DELETE)
    remove(@Param('id') id: string, @Request() req: any) {
        return this.patientsService.softDelete(id, req.clinicId);
    }
}
