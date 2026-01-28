import {
    Controller,
    Get,
    Put,
    Param,
    Body,
    UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';

@Controller('roles')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    /**
     * GET /roles
     * List all roles with permissions
     */
    @Get()
    @Permissions(PERMISSIONS.ROLE_READ)
    findAll() {
        return this.rolesService.findAll();
    }

    /**
     * GET /roles/:id
     * Get a single role with permissions
     */
    @Get(':id')
    @Permissions(PERMISSIONS.ROLE_READ)
    findOne(@Param('id') id: string) {
        return this.rolesService.findOne(id);
    }

    /**
     * GET /permissions
     * List all available permissions
     */
    @Get('permissions/all')
    @Permissions(PERMISSIONS.ROLE_READ)
    findAllPermissions() {
        return this.rolesService.findAllPermissions();
    }

    /**
     * PUT /roles/:id/permissions
     * Update permissions for a role
     */
    @Put(':id/permissions')
    @Permissions(PERMISSIONS.ROLE_MANAGE)
    updatePermissions(
        @Param('id') id: string,
        @Body() body: { permissionIds: string[] },
    ) {
        return this.rolesService.updatePermissions(id, body.permissionIds);
    }
}
