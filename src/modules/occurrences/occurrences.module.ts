import { Module } from '@nestjs/common';
import { OccurrencesService } from './occurrences.service';
import { OccurrencesController } from './occurrences.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { StockModule } from '../stock/stock.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [PrismaModule, StockModule, FinanceModule],
  controllers: [OccurrencesController],
  providers: [OccurrencesService],
  exports: [OccurrencesService],
})
export class OccurrencesModule {}
