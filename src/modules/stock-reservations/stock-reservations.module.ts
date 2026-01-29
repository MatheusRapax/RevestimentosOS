import { Module } from '@nestjs/common';
import { StockReservationsController } from './stock-reservations.controller';
import { StockReservationsService } from './stock-reservations.service';
import { PrismaModule } from 'src/core/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [StockReservationsController],
    providers: [StockReservationsService],
    exports: [StockReservationsService],
})
export class StockReservationsModule { }
