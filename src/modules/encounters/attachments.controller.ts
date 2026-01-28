import {
    Controller,
    Get,
    Post,
    Param,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Request,
    Res,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';
import * as fs from 'fs';

@Controller('encounters')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AttachmentsController {
    constructor(private readonly attachmentsService: AttachmentsService) { }

    @Get(':id/attachments')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.ENCOUNTER_READ)
    listAttachments(@Param('id') encounterId: string, @Request() req: any) {
        return this.attachmentsService.listAttachments(encounterId, req.clinicId);
    }

    @Post(':id/attachments')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.ENCOUNTER_UPDATE)
    @UseInterceptors(FileInterceptor('file'))
    uploadAttachment(
        @Param('id') encounterId: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
                    new FileTypeValidator({
                        fileType: /(pdf|jpg|jpeg|png)$/i,
                    }),
                ],
            }),
        )
        file: Express.Multer.File,
        @Request() req: any,
    ) {
        return this.attachmentsService.uploadAttachment(
            encounterId,
            req.clinicId,
            req.user.id,
            file,
        );
    }

    @Get(':id/attachments/:attachmentId')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.ENCOUNTER_READ)
    async downloadAttachment(
        @Param('id') encounterId: string,
        @Param('attachmentId') attachmentId: string,
        @Request() req: any,
        @Res() res: Response,
    ) {
        const file = await this.attachmentsService.downloadAttachment(
            encounterId,
            attachmentId,
            req.clinicId,
            req.user.id,
        );

        res.setHeader('Content-Type', file.mimeType);
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${file.filename}"`,
        );

        const stream = fs.createReadStream(file.path);
        stream.pipe(res);
    }
}
