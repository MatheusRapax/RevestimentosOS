import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaModule } from 'src/core/prisma/prisma.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
    imports: [PrismaModule, FinanceModule],
    controllers: [OrdersController],
    providers: [OrdersService],
    exports: [OrdersService],
})
export class OrdersModule { }
