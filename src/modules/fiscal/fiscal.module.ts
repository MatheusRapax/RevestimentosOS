import { Module } from '@nestjs/common';
import { FiscalService } from './services/fiscal.service';
import { FiscalController } from './controllers/fiscal.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { FiscalRulesModule } from '../fiscal-rules/fiscal-rules.module';

@Module({
  imports: [PrismaModule, HttpModule, ConfigModule, FiscalRulesModule],
  controllers: [FiscalController],
  providers: [FiscalService],
  exports: [FiscalService],
})
export class FiscalModule {}
