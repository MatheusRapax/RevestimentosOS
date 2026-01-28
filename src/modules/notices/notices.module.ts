import { Module } from '@nestjs/common';
import { NoticesController } from './notices.controller';
import { NoticesService } from './notices.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuditModule } from '../../core/audit/audit.module';

@Module({
    imports: [PrismaModule, AuditModule],
    controllers: [NoticesController],
    providers: [NoticesService],
    exports: [NoticesService],
})
export class NoticesModule { }
