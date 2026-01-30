import {
    Controller,
    Get,
    Param,
    Patch,
    Body,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { OrderStatus } from '@prisma/client';

interface AuthRequest extends Request {
    clinicId: string;
    user: { userId: string };
}

@Controller('orders')
@UseGuards(JwtAuthGuard, TenantGuard)
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Get()
    async findAll(
        @Request() req: AuthRequest,
        @Query('status') status?: string,
        @Query('customerId') customerId?: string,
    ) {
        return this.ordersService.findAll(req.clinicId, { status, customerId });
    }

    @Get('stats')
    async getStats(@Request() req: AuthRequest) {
        return this.ordersService.getStats(req.clinicId);
    }

    @Get(':id')
    async findOne(@Request() req: AuthRequest, @Param('id') id: string) {
        return this.ordersService.findOne(req.clinicId, id);
    }

    @Patch(':id/status')
    async updateStatus(
        @Request() req: AuthRequest,
        @Param('id') id: string,
        @Body('status') status: string,
    ) {
        return this.ordersService.updateStatus(req.clinicId, id, status as OrderStatus);
    }

    @Patch(':id/delivery')
    async updateDeliveryInfo(
        @Request() req: AuthRequest,
        @Param('id') id: string,
        @Body() body: { deliveryAddress?: string; deliveryDate?: string },
    ) {
        return this.ordersService.updateDeliveryInfo(req.clinicId, id, body);
    }
}
