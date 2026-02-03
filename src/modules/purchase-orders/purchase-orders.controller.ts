import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';

interface AuthRequest extends Request {
    clinicId: string;
}

import { ModuleGuard } from '../../core/auth/guards/module.guard';
import { RequireModules } from '../../core/auth/decorators/module.decorator';

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, TenantGuard, ModuleGuard)
@RequireModules('PURCHASES')
export class PurchaseOrdersController {
    constructor(private readonly service: PurchaseOrdersService) { }

    @Get()
    async findAll(
        @Request() req: AuthRequest,
        @Query('status') status?: string,
        @Query('supplierId') supplierId?: string,
    ) {
        return this.service.findAll(req.clinicId, { status, supplierId });
    }

    @Get(':id')
    async findOne(@Request() req: AuthRequest, @Param('id') id: string) {
        return this.service.findOne(req.clinicId, id);
    }

    @Post()
    async create(
        @Request() req: AuthRequest,
        @Body() body: any,
    ) {
        return this.service.create(req.clinicId, body);
    }

    @Put(':id')
    async update(
        @Request() req: AuthRequest,
        @Param('id') id: string,
        @Body() body: any,
    ) {
        return this.service.update(req.clinicId, id, body);
    }

    @Patch(':id/status')
    async updateStatus(
        @Request() req: AuthRequest,
        @Param('id') id: string,
        @Body('status') status: string,
    ) {
        return this.service.updateStatus(req.clinicId, id, status);
    }

    @Delete(':id')
    async delete(@Request() req: AuthRequest, @Param('id') id: string) {
        return this.service.delete(req.clinicId, id);
    }
}
