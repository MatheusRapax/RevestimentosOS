import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { QuotePdfService } from './pdf/quote-pdf.service';
import { QuoteTemplatesService } from './quote-templates.service';
import { QuoteTemplatesController } from './quote-templates.controller';
import { StockModule } from '../stock/stock.module';
import { StockReservationsModule } from '../stock-reservations/stock-reservations.module';

@Module({
    imports: [StockModule, StockReservationsModule],
    controllers: [QuotesController, QuoteTemplatesController],
    providers: [QuotesService, QuotePdfService, QuoteTemplatesService],
    exports: [QuotesService, QuoteTemplatesService],
})
export class QuotesModule { }

