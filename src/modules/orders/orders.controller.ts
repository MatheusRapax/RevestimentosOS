import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { OrderStatus } from '@prisma/client';
import { SalesOwnerGuard, SalesScopeService } from '../../core/rbac/sales-scope';

interface AuthRequest extends Request {
  clinicId: string;
  user: { userId: string };
}

import { ModuleGuard } from '../../core/auth/guards/module.guard';
import { RequireModules } from '../../core/auth/decorators/module.decorator';

const DonoDoPedido = SalesOwnerGuard('order');

@Controller('orders')
@UseGuards(JwtAuthGuard, TenantGuard, ModuleGuard, DonoDoPedido)
@RequireModules('SALES')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly escopoDeVendas: SalesScopeService,
  ) {}

  @Get()
  async findAll(
    @Request() req: AuthRequest,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
  ) {
    const escopo = await this.escopoDeVendas.daRequisicao(req);
    return this.ordersService.findAll(
      req.clinicId,
      { status, customerId },
      escopo,
    );
  }

  @Get('stats')
  async getStats(@Request() req: AuthRequest) {
    const escopo = await this.escopoDeVendas.daRequisicao(req);
    return this.ordersService.getStats(req.clinicId, escopo);
  }

  @Get('export/excel')
  async exportExcel(
    @Request() req: AuthRequest,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const escopo = await this.escopoDeVendas.daRequisicao(req);
    const buffer = await this.ordersService.exportToExcel(
      req.clinicId,
      startDate,
      endDate,
      escopo,
    );

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="faturamento.xlsx"',
    });

    res.send(buffer);
  }

  @Get(':id')
  async findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.ordersService.findOne(req.clinicId, id);
  }

  @Get(':id/commissions')
  async getOrderCommissions(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.ordersService.calculateOrderCommissions(req.clinicId, id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const userId = req.user?.userId;
    return this.ordersService.updateStatus(
      req.clinicId,
      id,
      dto.status as OrderStatus,
      userId,
      dto.paymentMethod,
      dto.payments,
    );
  }

  @Patch(':id/delivery')
  async updateDeliveryInfo(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: { deliveryAddress?: string; deliveryDate?: string },
  ) {
    return this.ordersService.updateDeliveryInfo(req.clinicId, id, body);
  }

  @Patch(':id/reservations/:reservationId/swap-lot')
  async swapReservationLot(
    @Request() req: AuthRequest,
    @Param('id') orderId: string,
    @Param('reservationId') reservationId: string,
    @Body() body: { newLotId: string },
  ) {
    return this.ordersService.swapReservationLot(
      req.clinicId,
      orderId,
      reservationId,
      body.newLotId,
      req.user?.userId,
    );
  }
}
