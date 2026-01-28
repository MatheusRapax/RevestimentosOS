import { Module } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockEntryController } from './stock-entry.controller';
import { StockEntryService } from './stock-entry.service';
import { StockExitController } from './stock-exit.controller';
import { StockExitService } from './stock-exit.service';
import { AuditModule } from '../../core/audit/audit.module';
import { StockController } from './stock.controller';
import { StockConsumptionService } from '../../core/stock/stock-consumption.service';

@Module({
    imports: [AuditModule],
    controllers: [StockController, StockEntryController, StockExitController],
    providers: [StockService, StockConsumptionService, StockEntryService, StockExitService],
    exports: [StockService, StockConsumptionService, StockEntryService, StockExitService],
})
export class StockModule { }
