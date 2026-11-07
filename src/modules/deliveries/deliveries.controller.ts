import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import {
  CreateDeliveryDto,
  UpdateDeliveryDto,
} from './dto/create-delivery.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';
import {
  SalesOwnerGuard,
  SalesScopeService,
} from '../../core/rbac/sales-scope';
import { DeliveryStatus } from '@prisma/client';

import { ModuleGuard } from '../../core/auth/guards/module.guard';
import { RequireModules } from '../../core/auth/decorators/module.decorator';

const DonoDaEntrega = SalesOwnerGuard('delivery');

@Controller('deliveries')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, ModuleGuard, DonoDaEntrega)
@RequireModules('DELIVERIES')
export class DeliveriesController {
  constructor(
    private readonly deliveriesService: DeliveriesService,
    private readonly escopoDeVendas: SalesScopeService,
  ) {}

  @Post()
  @Permissions(PERMISSIONS.DELIVERY_CREATE)
  async create(@Request() req: any, @Body() createDto: CreateDeliveryDto) {
    const escopo = await this.escopoDeVendas.daRequisicao(req);
    return this.deliveriesService.create(req.clinicId, createDto, escopo);
  }

  @Get()
  @Permissions(PERMISSIONS.DELIVERY_READ)
  async findAll(@Request() req: any, @Query('status') status?: DeliveryStatus) {
    const escopo = await this.escopoDeVendas.daRequisicao(req);
    return this.deliveriesService.findAll(req.clinicId, status, escopo);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.DELIVERY_READ)
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.deliveriesService.findOne(id, req.clinicId);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.DELIVERY_UPDATE)
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateDeliveryDto,
  ) {
    return this.deliveriesService.update(id, req.clinicId, updateDto);
  }
}
