import { Module } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { SchedulingController } from './scheduling.controller';
import { AuditModule } from '../../core/audit/audit.module';

@Module({
    imports: [AuditModule],
    controllers: [SchedulingController],
    providers: [SchedulingService],
})
export class SchedulingModule { }
