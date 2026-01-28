import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { StockEntryService } from './stock-entry.service';
import { CreateStockEntryDto } from './dto/create-stock-entry.dto';
import { AddStockEntryItemDto } from './dto/add-stock-entry-item.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';

@Controller('stock/entries')
@UseGuards(JwtAuthGuard, TenantGuard)
export class StockEntryController {
    constructor(private readonly service: StockEntryService) { }

    @Post()
    create(@Request() req: any, @Body() dto: CreateStockEntryDto) {
        return this.service.createDraft(req.clinicId, dto, req.user.id);
    }

    @Get()
    findAll(@Request() req: any, @Query('page') page: number) {
        return this.service.listEntries(req.clinicId, page ? Number(page) : 1);
    }

    @Get(':id')
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.service.getEntry(req.clinicId, id);
    }

    @Post(':id/items')
    addItem(@Request() req: any, @Param('id') id: string, @Body() dto: AddStockEntryItemDto) {
        return this.service.addItem(req.clinicId, id, dto);
    }

    @Delete(':id/items/:itemId')
    removeItem(@Request() req: any, @Param('id') id: string, @Param('itemId') itemId: string) {
        return this.service.removeItem(req.clinicId, id, itemId);
    }

    @Post(':id/confirm')
    confirm(@Request() req: any, @Param('id') id: string) {
        return this.service.confirmEntry(req.clinicId, id, req.user.id);
    }

    @Post(':id/cancel')
    cancel(@Request() req: any, @Param('id') id: string) {
        return this.service.cancelEntry(req.clinicId, id);
    }
}
