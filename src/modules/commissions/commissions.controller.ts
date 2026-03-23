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
import { CommissionsService } from './commissions.service';
import { CreateCommissionRuleDto } from './dto/create-commission-rule.dto';
import { UpdateCommissionRuleDto } from './dto/update-commission-rule.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';

@Controller('commissions')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Post()
  @Permissions(PERMISSIONS.COMMISSION_MANAGE)
  create(@Request() req: any, @Body() dto: CreateCommissionRuleDto) {
    const clinicId = req.clinicId;
    const currentUserId = req.user?.id;
    return this.commissionsService.create(clinicId, currentUserId, dto);
  }

  @Get()
  @Permissions(PERMISSIONS.COMMISSION_READ)
  findAll(@Request() req: any) {
    const clinicId = req.clinicId;
    return this.commissionsService.findAll(clinicId);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.COMMISSION_READ)
  findOne(@Request() req: any, @Param('id') id: string) {
    const clinicId = req.clinicId;
    return this.commissionsService.findOne(clinicId, id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.COMMISSION_MANAGE)
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCommissionRuleDto,
  ) {
    const clinicId = req.clinicId;
    const currentUserId = req.user?.id;
    return this.commissionsService.update(clinicId, id, currentUserId, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.COMMISSION_MANAGE)
  remove(@Request() req: any, @Param('id') id: string) {
    const clinicId = req.clinicId;
    const currentUserId = req.user?.id;
    return this.commissionsService.remove(clinicId, id, currentUserId);
  }
}
