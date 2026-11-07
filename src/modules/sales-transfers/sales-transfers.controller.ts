import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';
import { SalesScopeService } from '../../core/rbac/sales-scope';
import { ModuleGuard } from '../../core/auth/guards/module.guard';
import { RequireModules } from '../../core/auth/decorators/module.decorator';
import { SalesTransfersService } from './sales-transfers.service';
import { TransferirVendasDto } from './dto/transferir-vendas.dto';

/**
 * Transferência de vendas (orçamentos e pedidos) entre vendedores. Só com a permissão `sales.transfer`.
 * Quem não vê as vendas de todos só consegue transferir as próprias.
 */
@Controller('sales/transfers')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, ModuleGuard)
@RequireModules('SALES')
@Permissions(PERMISSIONS.SALES_TRANSFER)
export class SalesTransfersController {
  constructor(
    private readonly service: SalesTransfersService,
    private readonly escopo: SalesScopeService,
  ) {}

  @Get('sellers')
  listarVendedores(@Request() req: any) {
    return this.service.listarVendedores(req.clinicId);
  }

  @Get('open')
  async listarAbertas(
    @Request() req: any,
    @Query('sellerId') sellerId: string,
  ) {
    const escopo = await this.escopo.daRequisicao(req);
    return this.service.listarAbertas(req.clinicId, sellerId, escopo);
  }

  @Get()
  async historico(@Request() req: any, @Query('limit') limit?: string) {
    const escopo = await this.escopo.daRequisicao(req);
    return this.service.historico(
      req.clinicId,
      escopo,
      limit ? Number(limit) : 100,
    );
  }

  @Post('preview')
  @HttpCode(200)
  async previa(@Request() req: any, @Body() dto: TransferirVendasDto) {
    const escopo = await this.escopo.daRequisicao(req);
    return this.service.previa(req.clinicId, dto, escopo);
  }

  @Post()
  async transferir(@Request() req: any, @Body() dto: TransferirVendasDto) {
    const escopo = await this.escopo.daRequisicao(req);
    return this.service.transferir(req.clinicId, req.user.id, dto, escopo);
  }
}
