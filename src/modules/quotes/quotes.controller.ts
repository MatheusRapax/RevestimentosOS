import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
    Request,
    Res,
} from '@nestjs/common';
import { Response } from 'express';
import { QuotesService } from './quotes.service';
import { QuotePdfService } from './pdf/quote-pdf.service';
import { CreateQuoteDto, CreateQuoteItemDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { UpdateQuoteItemDto } from './dto/update-quote-item.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';
import { QuoteStatus } from '@prisma/client';

@Controller('quotes')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class QuotesController {
    constructor(
        private readonly quotesService: QuotesService,
        private readonly quotePdfService: QuotePdfService,
    ) { }

    @Get(':id/pdf')
    @Permissions(PERMISSIONS.QUOTE_READ)
    async generatePdf(
        @Request() req: any,
        @Param('id') id: string,
        @Res() res: Response,
    ) {
        const quote = await this.quotesService.findOne(id, req.clinicId);
        const buffer = await this.quotePdfService.generatePdf(quote as any);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=orcamento-${quote.number}.pdf`,
            'Content-Length': buffer.length,
        });

        res.end(buffer);
    }

    @Post()
    @Permissions(PERMISSIONS.QUOTE_CREATE)
    create(@Request() req: any, @Body() createQuoteDto: CreateQuoteDto) {
        return this.quotesService.create(req.clinicId, req.user.id, createQuoteDto);
    }

    @Get()
    @Permissions(PERMISSIONS.QUOTE_READ)
    findAll(@Request() req: any, @Query('status') status?: QuoteStatus) {
        return this.quotesService.findAll(req.clinicId, status);
    }

    @Get(':id/availability')
    @Permissions(PERMISSIONS.QUOTE_READ)
    checkAvailability(@Request() req: any, @Param('id') id: string) {
        return this.quotesService.checkAvailability(id, req.clinicId);
    }

    @Get(':id')
    @Permissions(PERMISSIONS.QUOTE_READ)
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.quotesService.findOne(id, req.clinicId);
    }

    @Patch(':id')
    @Permissions(PERMISSIONS.QUOTE_UPDATE)
    update(
        @Request() req: any,
        @Param('id') id: string,
        @Body() updateQuoteDto: UpdateQuoteDto,
    ) {
        return this.quotesService.update(id, req.clinicId, updateQuoteDto);
    }

    @Post(':id/send')
    @Permissions(PERMISSIONS.QUOTE_SEND)
    sendQuote(@Request() req: any, @Param('id') id: string) {
        return this.quotesService.sendQuote(id, req.clinicId);
    }

    @Post(':id/approve')
    @Permissions(PERMISSIONS.QUOTE_UPDATE)
    approveQuote(@Request() req: any, @Param('id') id: string) {
        return this.quotesService.approveQuote(id, req.clinicId);
    }

    @Post(':id/convert')
    @Permissions(PERMISSIONS.QUOTE_CONVERT)
    convertToOrder(@Request() req: any, @Param('id') id: string) {
        return this.quotesService.convertToOrder(id, req.clinicId, req.user.id);
    }

    @Post(':id/reserve')
    @Permissions(PERMISSIONS.QUOTE_UPDATE)
    reserveStock(@Request() req: any, @Param('id') id: string) {
        return this.quotesService.reserveStock(id, req.clinicId);
    }

    @Delete(':id')
    @Permissions(PERMISSIONS.QUOTE_DELETE)
    remove(@Request() req: any, @Param('id') id: string) {
        return this.quotesService.deleteQuote(id, req.clinicId);
    }

    // ========== ITEM MANAGEMENT ENDPOINTS ==========

    @Post(':id/items')
    @Permissions(PERMISSIONS.QUOTE_UPDATE)
    addItem(
        @Request() req: any,
        @Param('id') id: string,
        @Body() createItemDto: CreateQuoteItemDto, // Reusing existing DTO
    ) {
        return this.quotesService.addItem(id, req.clinicId, createItemDto);
    }

    @Patch(':id/items/:itemId')
    @Permissions(PERMISSIONS.QUOTE_UPDATE)
    updateItem(
        @Request() req: any,
        @Param('id') id: string,
        @Param('itemId') itemId: string,
        @Body() updateItemDto: UpdateQuoteItemDto,
    ) {
        return this.quotesService.updateItem(id, itemId, req.clinicId, updateItemDto);
    }

    @Delete(':id/items/:itemId')
    @Permissions(PERMISSIONS.QUOTE_UPDATE)
    removeItem(
        @Request() req: any,
        @Param('id') id: string,
        @Param('itemId') itemId: string,
    ) {
        return this.quotesService.removeItem(id, itemId, req.clinicId);
    }
}
