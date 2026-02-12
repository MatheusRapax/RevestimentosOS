import { Module } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockEntryController } from './stock-entry.controller';
import { StockEntryService } from './stock-entry.service';
import { StockExitController } from './stock-exit.controller';
import { StockExitService } from './stock-exit.service';
import { AuditModule } from '../../core/audit/audit.module';
import { StockController } from './stock.controller';
import { StockConsumptionService } from '../../core/stock/stock-consumption.service';
import { ExcelService } from '../../core/excel/excel.service';
import { ProductImportService } from './services/product-import.service';
import { ProductImportController } from './product-import.controller';

import { StockAllocationService } from './services/stock-allocation.service';

@Module({
    imports: [AuditModule],
    controllers: [StockController, StockEntryController, StockExitController, ProductImportController],
    providers: [StockService, StockConsumptionService, StockEntryService, StockExitService, ExcelService, ProductImportService, StockAllocationService],
    exports: [StockService, StockConsumptionService, StockEntryService, StockExitService, StockAllocationService],
})
export class StockModule { }
