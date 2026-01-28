import { Module } from '@nestjs/common';
import { ProfessionalsController } from './professionals.controller';
import { ProfessionalsService } from './professionals.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuditModule } from '../../core/audit/audit.module';

@Module({
    imports: [PrismaModule, AuditModule],
    controllers: [ProfessionalsController],
    providers: [ProfessionalsService],
})
export class ProfessionalsModule { }
