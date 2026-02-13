import { Module, forwardRef } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { DeliveriesController } from './deliveries.controller';
import { PrismaModule } from 'src/core/prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
    imports: [PrismaModule, forwardRef(() => OrdersModule)],
    controllers: [DeliveriesController],
    providers: [DeliveriesService],
    exports: [DeliveriesService],
})
export class DeliveriesModule { }
