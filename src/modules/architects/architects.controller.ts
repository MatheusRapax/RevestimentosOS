import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ArchitectsService } from './architects.service';
import { CreateArchitectDto } from './dto/create-architect.dto';
import { UpdateArchitectDto } from './dto/update-architect.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';

@Controller('architects')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ArchitectsController {
    constructor(private readonly architectsService: ArchitectsService) { }

    @Post()
    @Permissions(PERMISSIONS.ARCHITECT_CREATE)
    create(@Request() req: any, @Body() createArchitectDto: CreateArchitectDto) {
        return this.architectsService.create(req.clinicId, createArchitectDto);
    }

    @Get()
    @Permissions(PERMISSIONS.ARCHITECT_READ)
    findAll(@Request() req: any, @Query('isActive') isActive?: string) {
        const active = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
        return this.architectsService.findAll(req.clinicId, active);
    }

    @Get(':id')
    @Permissions(PERMISSIONS.ARCHITECT_READ)
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.architectsService.findOne(id, req.clinicId);
    }

    @Get(':id/commissions')
    @Permissions(PERMISSIONS.COMMISSION_REPORT_READ)
    getCommissionReport(
        @Request() req: any,
        @Param('id') id: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;
        return this.architectsService.getCommissionReport(id, req.clinicId, start, end);
    }

    @Patch(':id')
    @Permissions(PERMISSIONS.ARCHITECT_UPDATE)
    update(
        @Request() req: any,
        @Param('id') id: string,
        @Body() updateArchitectDto: UpdateArchitectDto,
    ) {
        return this.architectsService.update(id, req.clinicId, updateArchitectDto);
    }

    @Delete(':id')
    @Permissions(PERMISSIONS.ARCHITECT_DELETE)
    remove(@Request() req: any, @Param('id') id: string) {
        return this.architectsService.softDelete(id, req.clinicId);
    }
}
