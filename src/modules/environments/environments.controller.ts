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
} from '@nestjs/common';
import { EnvironmentsService } from './environments.service';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';
import { ModuleGuard } from '../../core/auth/guards/module.guard';
import { RequireModules } from '../../core/auth/decorators/module.decorator';

@Controller('environments')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, ModuleGuard)
@RequireModules('SALES')
export class EnvironmentsController {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  @Post()
  @Permissions(PERMISSIONS.ENVIRONMENT_CREATE)
  create(
    @Request() req: any,
    @Body() createEnvironmentDto: CreateEnvironmentDto,
  ) {
    return this.environmentsService.create(req.clinicId, createEnvironmentDto);
  }

  @Get()
  @Permissions(PERMISSIONS.ENVIRONMENT_READ)
  findAll(@Request() req: any) {
    return this.environmentsService.findAll(req.clinicId);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.ENVIRONMENT_READ)
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.environmentsService.findOne(id, req.clinicId);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.ENVIRONMENT_UPDATE)
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateEnvironmentDto: UpdateEnvironmentDto,
  ) {
    return this.environmentsService.update(id, req.clinicId, updateEnvironmentDto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.ENVIRONMENT_DELETE)
  remove(@Request() req: any, @Param('id') id: string) {
    return this.environmentsService.remove(id, req.clinicId);
  }
}
