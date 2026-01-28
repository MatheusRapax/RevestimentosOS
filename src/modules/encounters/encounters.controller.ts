import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    Res,
} from '@nestjs/common';
import { Response } from 'express';
import { EncountersService } from './encounters.service';
import { ReportService } from './report.service';
import { StartEncounterDto } from './dto/start-encounter.dto';
import { CloseEncounterDto } from './dto/close-encounter.dto';
import { AddRecordDto } from './dto/add-record.dto';
import { CreateNoteDto, UpdateNoteDto } from './dto/note.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';

@Controller('encounters')
@UseGuards(JwtAuthGuard, TenantGuard)
export class EncountersController {
    constructor(
        private readonly encountersService: EncountersService,
        private readonly reportService: ReportService,
    ) { }

    // ========== BASIC CRUD ==========

    @Get()
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.ENCOUNTER_READ)
    findAll(@Request() req: any, @Query('patientId') patientId?: string) {
        return this.encountersService.findAll(req.clinicId, patientId);
    }

    @Post()
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.ENCOUNTER_START)
    create(@Body() createDto: any, @Request() req: any) {
        return this.encountersService.create(req.clinicId, createDto);
    }

    @Patch(':id')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.ENCOUNTER_UPDATE)
    update(@Param('id') id: string, @Body() updateDto: any, @Request() req: any) {
        return this.encountersService.update(id, req.clinicId, updateDto);
    }

    @Delete(':id')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.ENCOUNTER_UPDATE)
    remove(@Param('id') id: string, @Request() req: any) {
        return this.encountersService.remove(id, req.clinicId);
    }

    // ========== SPECIALIZED ENDPOINTS ==========

    @Post('start')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.ENCOUNTER_START)
    startEncounter(
        @Body() startEncounterDto: StartEncounterDto,
        @Request() req: any,
    ) {
        return this.encountersService.startEncounter(
            req.clinicId,
            startEncounterDto,
        );
    }

    // ========== REPORT (must come before :id) ==========

    @Get(':id/report')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.ENCOUNTER_READ)
    async generateReport(
        @Param('id') encounterId: string,
        @Request() req: any,
        @Res() res: Response,
    ) {
        const pdfBuffer = await this.reportService.generateReport(
            encounterId,
            req.clinicId,
            req.user.id,
        );

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="relatorio-atendimento-${encounterId}.pdf"`,
        );
        res.setHeader('Content-Length', pdfBuffer.length);

        res.send(pdfBuffer);
    }

    @Get(':id')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.ENCOUNTER_READ)
    findOne(@Param('id') id: string, @Request() req: any) {
        return this.encountersService.findOne(id, req.clinicId);
    }

    @Post(':id/records')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.RECORD_CREATE)
    addRecord(
        @Param('id') id: string,
        @Body() addRecordDto: AddRecordDto,
        @Request() req: any,
    ) {
        return this.encountersService.addRecord(id, req.clinicId, addRecordDto);
    }

    @Post(':id/close')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.ENCOUNTER_CLOSE)
    closeEncounter(
        @Param('id') id: string,
        @Body() closeEncounterDto: CloseEncounterDto,
        @Request() req: any,
    ) {
        return this.encountersService.closeEncounter(
            id,
            req.clinicId,
            closeEncounterDto,
        );
    }

    @Get(':id/timeline')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.ENCOUNTER_READ)
    getTimeline(@Param('id') id: string, @Request() req: any) {
        return this.encountersService.getTimeline(id, req.clinicId);
    }

    // ========== CLINICAL NOTES (SOAP) ==========

    @Get(':id/note')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.ENCOUNTER_READ)
    getNote(@Param('id') id: string, @Request() req: any) {
        return this.encountersService.getNote(id, req.clinicId);
    }

    @Post(':id/note')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.ENCOUNTER_UPDATE)
    createNote(
        @Param('id') id: string,
        @Body() createNoteDto: CreateNoteDto,
        @Request() req: any,
    ) {
        return this.encountersService.createNote(
            id,
            req.clinicId,
            req.user.id,
            createNoteDto,
        );
    }

    @Put(':id/note')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.ENCOUNTER_UPDATE)
    updateNote(
        @Param('id') id: string,
        @Body() updateNoteDto: UpdateNoteDto,
        @Request() req: any,
    ) {
        return this.encountersService.updateNote(
            id,
            req.clinicId,
            req.user.id,
            updateNoteDto,
        );
    }
}
