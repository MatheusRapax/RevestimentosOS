import { Module } from '@nestjs/common';
import { EncounterItemsService } from './encounter-items.service';
import { EncounterItemsController } from './encounter-items.controller';
import { StockModule } from '../stock/stock.module';

@Module({
    imports: [StockModule],
    controllers: [EncounterItemsController],
    providers: [EncounterItemsService],
})
export class EncounterItemsModule { }
