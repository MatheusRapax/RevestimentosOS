import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { StockExitService, CreateStockExitDto, AddStockExitItemDto } from './stock-exit.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';

@Controller('stock/exits')
@UseGuards(JwtAuthGuard, TenantGuard)
export class StockExitController {
    constructor(private readonly service: StockExitService) { }

    @Post()
    create(@Request() req: any, @Body() dto: CreateStockExitDto) {
        return this.service.createDraft(req.clinicId, dto, req.user.id);
    }

    @Get()
    findAll(@Request() req: any, @Query('page') page: number) {
        return this.service.listExits(req.clinicId, page ? Number(page) : 1);
    }

    @Get(':id')
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.service.getExit(req.clinicId, id);
    }

    @Post(':id/items')
    addItem(@Request() req: any, @Param('id') id: string, @Body() dto: AddStockExitItemDto) {
        return this.service.addItem(req.clinicId, id, dto);
    }

    @Delete(':id/items/:itemId')
    removeItem(@Request() req: any, @Param('id') id: string, @Param('itemId') itemId: string) {
        return this.service.removeItem(req.clinicId, id, itemId);
    }

    @Post(':id/confirm')
    confirm(@Request() req: any, @Param('id') id: string) {
        return this.service.confirmExit(req.clinicId, id, req.user.id);
    }

    @Post(':id/cancel')
    cancel(@Request() req: any, @Param('id') id: string) {
        return this.service.cancelExit(req.clinicId, id);
    }
}
