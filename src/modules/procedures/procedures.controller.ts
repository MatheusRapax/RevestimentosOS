import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ProceduresService, CreateProcedureDto, UpdateProcedureDto, AddConsumableDto } from './procedures.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';

@Controller('procedures')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ProceduresController {
    constructor(private readonly proceduresService: ProceduresService) { }

    /**
     * GET /procedures
     * List all procedures
     */
    @Get()
    @Permissions(PERMISSIONS.PROCEDURE_READ)
    findAll(@Request() req: any, @Query('includeInactive') includeInactive?: string) {
        return this.proceduresService.findAll(req.clinicId, includeInactive === 'true');
    }

    /**
     * GET /procedures/:id
     * Get a single procedure
     */
    @Get(':id')
    @Permissions(PERMISSIONS.PROCEDURE_READ)
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.proceduresService.findOne(req.clinicId, id);
    }

    /**
     * POST /procedures
     * Create a new procedure
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Permissions(PERMISSIONS.PROCEDURE_CREATE)
    create(@Request() req: any, @Body() dto: CreateProcedureDto) {
        return this.proceduresService.create(req.clinicId, req.user?.id, dto);
    }

    /**
     * PATCH /procedures/:id
     * Update a procedure
     */
    @Patch(':id')
    @Permissions(PERMISSIONS.PROCEDURE_UPDATE)
    update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateProcedureDto) {
        return this.proceduresService.update(req.clinicId, id, req.user?.id, dto);
    }

    /**
     * DELETE /procedures/:id
     * Soft delete a procedure
     */
    @Delete(':id')
    @Permissions(PERMISSIONS.PROCEDURE_UPDATE)
    remove(@Request() req: any, @Param('id') id: string) {
        return this.proceduresService.remove(req.clinicId, id, req.user?.id);
    }

    /**
     * POST /procedures/:id/consumables
     * Add consumable to procedure
     */
    @Post(':id/consumables')
    @Permissions(PERMISSIONS.PROCEDURE_UPDATE)
    addConsumable(@Request() req: any, @Param('id') id: string, @Body() dto: AddConsumableDto) {
        return this.proceduresService.addConsumable(req.clinicId, id, req.user?.id, dto);
    }

    /**
     * DELETE /procedures/:id/consumables/:productId
     * Remove consumable from procedure
     */
    @Delete(':id/consumables/:productId')
    @Permissions(PERMISSIONS.PROCEDURE_UPDATE)
    removeConsumable(
        @Request() req: any,
        @Param('id') id: string,
        @Param('productId') productId: string,
    ) {
        return this.proceduresService.removeConsumable(req.clinicId, id, productId, req.user?.id);
    }
}
