import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { QuotePdfService } from './pdf/quote-pdf.service';

@Module({
    controllers: [QuotesController],
    providers: [QuotesService, QuotePdfService],
    exports: [QuotesService],
})
export class QuotesModule { }
