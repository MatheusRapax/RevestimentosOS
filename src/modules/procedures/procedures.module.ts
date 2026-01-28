import { Module } from '@nestjs/common';
import { ProceduresService } from './procedures.service';
import { ProceduresController } from './procedures.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuditModule } from '../../core/audit/audit.module';

@Module({
    imports: [PrismaModule, AuditModule],
    controllers: [ProceduresController],
    providers: [ProceduresService],
    exports: [ProceduresService],
})
export class ProceduresModule { }
