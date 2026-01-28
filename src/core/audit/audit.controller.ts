import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuditService } from './audit.service';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { TenantGuard } from '../tenant/guards/tenant.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { Permissions } from '../rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../rbac/permissions';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    @Get()
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.AUDIT_READ)
    async findAll(@Query() query: ListAuditLogsDto, @Request() req: any) {
        const filters = {
            userId: query.userId,
            action: query.action,
            entity: query.entity,
            dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
            dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
        };

        const logs = await this.auditService.findAll(req.clinicId, filters);

        return {
            data: logs,
            count: logs.length,
        };
    }
}
