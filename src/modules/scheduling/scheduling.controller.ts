import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Request,
    Query,
} from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { ListAppointmentDto } from './dto/list-appointment.dto';
import { CreateBlockDto } from './dto/create-block.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';

@Controller('appointments')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SchedulingController {
    constructor(private readonly schedulingService: SchedulingService) { }

    @Post()
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.APPOINTMENT_CREATE)
    create(
        @Body() createAppointmentDto: CreateAppointmentDto,
        @Request() req: any,
    ) {
        return this.schedulingService.create(req.clinicId, createAppointmentDto);
    }

    @Get('professionals')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.APPOINTMENT_READ)
    listProfessionals(@Request() req: any) {
        return this.schedulingService.listProfessionals(req.clinicId);
    }

    @Get()
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.APPOINTMENT_READ)
    findAll(@Query() filters: ListAppointmentDto, @Request() req: any) {
        return this.schedulingService.findAll(req.clinicId, filters);
    }

    // ========== SCHEDULE BLOCKS (must come before :id) ==========

    @Get('blocks')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.APPOINTMENT_READ)
    listBlocks(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Request() req: any,
    ) {
        return this.schedulingService.listBlocks(req.clinicId, startDate, endDate);
    }

    @Post('blocks')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.SCHEDULE_BLOCK)
    createBlock(@Body() dto: CreateBlockDto, @Request() req: any) {
        return this.schedulingService.createBlock(req.clinicId, req.user.id, dto);
    }

    @Delete('blocks/:id')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.SCHEDULE_BLOCK)
    deleteBlock(@Param('id') id: string, @Request() req: any) {
        return this.schedulingService.deleteBlock(id, req.clinicId, req.user.id);
    }

    // ========== WORKING HOURS ==========

    @Get('working-hours')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.APPOINTMENT_READ)
    getWorkingHours(@Request() req: any) {
        return this.schedulingService.getWorkingHours(req.clinicId);
    }

    @Put('working-hours')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.SCHEDULE_BLOCK)
    updateWorkingHours(@Body() dto: any, @Request() req: any) {
        return this.schedulingService.updateWorkingHours(req.clinicId, req.user.id, dto);
    }

    @Get(':id')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.APPOINTMENT_READ)
    findOne(@Param('id') id: string, @Request() req: any) {
        return this.schedulingService.findOne(id, req.clinicId);
    }

    @Patch(':id')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.APPOINTMENT_UPDATE)
    update(
        @Param('id') id: string,
        @Body() updateAppointmentDto: UpdateAppointmentDto,
        @Request() req: any,
    ) {
        return this.schedulingService.update(
            id,
            req.clinicId,
            updateAppointmentDto,
        );
    }

    @Post(':id/checkin')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.APPOINTMENT_CHECKIN)
    checkIn(@Param('id') id: string, @Request() req: any) {
        return this.schedulingService.checkIn(id, req.clinicId);
    }

    @Delete(':id')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.APPOINTMENT_CANCEL)
    cancel(@Param('id') id: string, @Request() req: any) {
        return this.schedulingService.cancel(id, req.clinicId);
    }

    @Post(':id/start-encounter')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.ENCOUNTER_START)
    startEncounter(
        @Param('id') id: string,
        @Body() dto: { notes?: string },
        @Request() req: any,
    ) {
        return this.schedulingService.startEncounterFromAppointment(
            id,
            req.clinicId,
            dto,
        );
    }
}
