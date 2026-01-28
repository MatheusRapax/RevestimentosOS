import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    UseGuards,
    Request,
} from '@nestjs/common';
import { NoticesService } from './notices.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';
import { CreateNoticeDto, UpdateNoticeDto } from './dto/notice.dto';

interface AuthRequest {
    user: { id: string; email: string };
    clinicId: string;
}

@Controller('notices')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class NoticesController {
    constructor(private noticesService: NoticesService) { }

    @Get()
    @Permissions(PERMISSIONS.NOTICE_READ)
    findAll(@Request() req: AuthRequest) {
        return this.noticesService.findAll(req.clinicId);
    }

    @Get(':id')
    @Permissions(PERMISSIONS.NOTICE_READ)
    findOne(@Param('id') id: string, @Request() req: AuthRequest) {
        return this.noticesService.findOne(id, req.clinicId);
    }

    @Post()
    @Permissions(PERMISSIONS.NOTICE_CREATE)
    create(@Request() req: AuthRequest, @Body() dto: CreateNoticeDto) {
        return this.noticesService.create(req.clinicId, req.user.id, dto);
    }

    @Patch(':id')
    @Permissions(PERMISSIONS.NOTICE_UPDATE)
    update(
        @Param('id') id: string,
        @Request() req: AuthRequest,
        @Body() dto: UpdateNoticeDto,
    ) {
        return this.noticesService.update(id, req.clinicId, req.user.id, dto);
    }

    @Delete(':id')
    @Permissions(PERMISSIONS.NOTICE_DELETE)
    remove(@Param('id') id: string, @Request() req: AuthRequest) {
        return this.noticesService.remove(id, req.clinicId, req.user.id);
    }
}
