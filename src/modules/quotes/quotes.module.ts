import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { QuotePdfService } from './pdf/quote-pdf.service';
import { StockModule } from '../stock/stock.module';
import { StockReservationsModule } from '../stock-reservations/stock-reservations.module';

@Module({
    imports: [StockModule, StockReservationsModule],
    controllers: [QuotesController],
    providers: [QuotesService, QuotePdfService],
    exports: [QuotesService],
})
export class QuotesModule { }
