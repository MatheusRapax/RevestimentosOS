import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { RolesController } from './roles.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [AdminController, RolesController],
    providers: [AdminService],
})
export class AdminModule { }
