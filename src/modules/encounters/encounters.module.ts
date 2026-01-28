import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { EncountersService } from './encounters.service';
import { EncountersController } from './encounters.controller';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
import { ReportService } from './report.service';
import { AuditModule } from '../../core/audit/audit.module';

@Module({
    imports: [
        AuditModule,
        MulterModule.register({
            storage: memoryStorage(),
        }),
    ],
    controllers: [EncountersController, AttachmentsController],
    providers: [EncountersService, AttachmentsService, ReportService],
})
export class EncountersModule { }
