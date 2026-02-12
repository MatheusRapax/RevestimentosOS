import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaModule } from 'src/core/prisma/prisma.module';
import { FinanceModule } from '../finance/finance.module';
import { StockModule } from '../stock/stock.module';

@Module({
    imports: [PrismaModule, FinanceModule, StockModule],
    controllers: [OrdersController],
    providers: [OrdersService],
    exports: [OrdersService],
})
export class OrdersModule { }
