import { Module } from '@nestjs/common';
import { ArchitectsService } from './architects.service';
import { ArchitectsController } from './architects.controller';

@Module({
    controllers: [ArchitectsController],
    providers: [ArchitectsService],
    exports: [ArchitectsService],
})
export class ArchitectsModule { }
