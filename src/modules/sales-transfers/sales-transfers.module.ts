import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { SalesTransfersController } from './sales-transfers.controller';
import { SalesTransfersService } from './sales-transfers.service';

@Module({
  imports: [PrismaModule],
  controllers: [SalesTransfersController],
  providers: [SalesTransfersService],
})
export class SalesTransfersModule {}
