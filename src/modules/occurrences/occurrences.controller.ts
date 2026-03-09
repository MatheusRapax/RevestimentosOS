import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OccurrencesService } from './occurrences.service';
import { CreateOccurrenceDto } from './dto/create-occurrence.dto';
import { UpdateOccurrenceStatusDto } from './dto/update-occurrence.dto';

import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';
import { ModuleGuard } from '../../core/auth/guards/module.guard';
import { RequireModules } from '../../core/auth/decorators/module.decorator';

@Controller('occurrences')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, ModuleGuard)
@RequireModules('RMA')
export class OccurrencesController {
  constructor(private readonly occurrencesService: OccurrencesService) {}

  @Post()
  @Permissions(PERMISSIONS.RMA_MANAGE)
  create(@Req() req: any, @Body() createOccurrenceDto: CreateOccurrenceDto) {
    return this.occurrencesService.create(
      req.user.clinicId,
      createOccurrenceDto,
    );
  }

  @Get()
  @Permissions(PERMISSIONS.RMA_READ)
  findAll(@Req() req: any) {
    return this.occurrencesService.findAll(req.user.clinicId);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.RMA_READ)
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.occurrencesService.findOne(req.user.clinicId, id);
  }

  @Patch(':id/status')
  @Permissions(PERMISSIONS.RMA_MANAGE)
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateOccurrenceStatusDto: UpdateOccurrenceStatusDto,
  ) {
    return this.occurrencesService.updateStatus(
      req.user.clinicId,
      req.user.id,
      id,
      updateOccurrenceStatusDto,
    );
  }
}
