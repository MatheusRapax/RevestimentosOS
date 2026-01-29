import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { StockReservationsService } from './stock-reservations.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';

interface AuthRequest extends Request {
    clinicId: string;
}

@Controller('stock-reservations')
@UseGuards(JwtAuthGuard, TenantGuard)
export class StockReservationsController {
    constructor(private readonly service: StockReservationsService) { }

    @Post()
    async create(
        @Request() req: AuthRequest,
        @Body() body: {
            orderId?: string;
            quoteId?: string;
            lotId: string;
            quantity: number;
        },
    ) {
        return this.service.create(req.clinicId, body);
    }

    @Get('by-quote/:quoteId')
    async findByQuote(
        @Request() req: AuthRequest,
        @Param('quoteId') quoteId: string,
    ) {
        return this.service.findByQuote(req.clinicId, quoteId);
    }

    @Patch(':id/cancel')
    async cancel(@Request() req: AuthRequest, @Param('id') id: string) {
        return this.service.cancel(req.clinicId, id);
    }

    @Post('expire-check')
    async checkExpiration(@Request() req: AuthRequest) {
        return this.service.expireOldReservations(req.clinicId);
    }
}
