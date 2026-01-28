import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { EncounterItemsService } from './encounter-items.service';
import { AddProcedureDto } from './dto/add-procedure.dto';
import { AddConsumableDto } from './dto/add-consumable.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';

@Controller('encounters')
@UseGuards(JwtAuthGuard, TenantGuard)
export class EncounterItemsController {
    constructor(
        private readonly encounterItemsService: EncounterItemsService,
    ) { }

    // ========== PROCEDURES ==========

    @Post(':id/procedures')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.PROCEDURE_CREATE)
    addProcedure(
        @Param('id') encounterId: string,
        @Body() addProcedureDto: AddProcedureDto,
        @Request() req: any,
    ) {
        return this.encounterItemsService.addProcedure(
            encounterId,
            req.clinicId,
            addProcedureDto,
        );
    }

    @Get(':id/procedures')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.PROCEDURE_READ)
    listProcedures(@Param('id') encounterId: string, @Request() req: any) {
        return this.encounterItemsService.listProcedures(encounterId, req.clinicId);
    }

    @Delete(':id/procedures/:procedureId')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.PROCEDURE_UPDATE)
    removeProcedure(
        @Param('id') encounterId: string,
        @Param('procedureId') procedureId: string,
        @Request() req: any,
    ) {
        return this.encounterItemsService.removeProcedure(
            procedureId,
            encounterId,
            req.clinicId,
        );
    }

    // ========== CONSUMABLES ==========

    @Post(':id/consumables')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.CONSUMABLE_ADD)
    addConsumable(
        @Param('id') encounterId: string,
        @Body() addConsumableDto: AddConsumableDto,
        @Request() req: any,
    ) {
        return this.encounterItemsService.addConsumable(
            encounterId,
            req.clinicId,
            addConsumableDto,
        );
    }

    @Get(':id/consumables')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.CONSUMABLE_READ)
    listConsumables(@Param('id') encounterId: string, @Request() req: any) {
        return this.encounterItemsService.listConsumables(
            encounterId,
            req.clinicId,
        );
    }

    @Delete(':id/consumables/:consumableId')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.CONSUMABLE_READ)
    removeConsumable(
        @Param('id') encounterId: string,
        @Param('consumableId') consumableId: string,
        @Request() req: any,
    ) {
        return this.encounterItemsService.removeConsumable(
            consumableId,
            encounterId,
            req.clinicId,
        );
    }
}
