
import { Module } from '@nestjs/common';
import { FiscalService } from './services/fiscal.service';
import { FiscalController } from './controllers/fiscal.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [PrismaModule, HttpModule, ConfigModule],
    controllers: [FiscalController],
    providers: [FiscalService],
    exports: [FiscalService],
})
export class FiscalModule { }
