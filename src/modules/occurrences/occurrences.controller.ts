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
import {
  SalesOwnerGuard,
  SalesScopeService,
} from '../../core/rbac/sales-scope';
import { ModuleGuard } from '../../core/auth/guards/module.guard';
import { RequireModules } from '../../core/auth/decorators/module.decorator';

const DonoDaAvaria = SalesOwnerGuard('occurrence');

@Controller('occurrences')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, ModuleGuard, DonoDaAvaria)
@RequireModules('RMA')
export class OccurrencesController {
  constructor(
    private readonly occurrencesService: OccurrencesService,
    private readonly escopoDeVendas: SalesScopeService,
  ) {}

  @Post()
  @Permissions(PERMISSIONS.RMA_MANAGE)
  async create(
    @Req() req: any,
    @Body() createOccurrenceDto: CreateOccurrenceDto,
  ) {
    const escopo = await this.escopoDeVendas.daRequisicao(req);
    // não abre avaria em pedido de outro vendedor
    await this.occurrencesService.assertPedidoVisivel(
      req.clinicId,
      createOccurrenceDto.orderId,
      escopo,
    );
    return this.occurrencesService.create(req.clinicId, createOccurrenceDto);
  }

  @Get()
  @Permissions(PERMISSIONS.RMA_READ)
  async findAll(@Req() req: any) {
    const escopo = await this.escopoDeVendas.daRequisicao(req);
    return this.occurrencesService.findAll(req.clinicId, escopo);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.RMA_READ)
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.occurrencesService.findOne(req.clinicId, id);
  }

  @Patch(':id/status')
  @Permissions(PERMISSIONS.RMA_MANAGE)
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateOccurrenceStatusDto: UpdateOccurrenceStatusDto,
  ) {
    return this.occurrencesService.updateStatus(
      req.clinicId,
      req.user.id,
      id,
      updateOccurrenceStatusDto,
    );
  }
}
