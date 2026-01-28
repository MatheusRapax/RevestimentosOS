import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { AuditAction } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_BASE_PATH = './uploads';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
];

@Injectable()
export class AttachmentsService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
    ) { }

    async listAttachments(encounterId: string, clinicId: string) {
        // Validate encounter exists and belongs to clinic
        const encounter = await this.prisma.encounter.findFirst({
            where: { id: encounterId, clinicId },
        });

        if (!encounter) {
            throw new NotFoundException('Atendimento não encontrado');
        }

        const attachments = await this.prisma.encounterAttachment.findMany({
            where: { encounterId, clinicId },
            include: {
                uploadedBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return attachments;
    }

    async uploadAttachment(
        encounterId: string,
        clinicId: string,
        userId: string,
        file: Express.Multer.File,
    ) {
        // Validate encounter exists and belongs to clinic
        const encounter = await this.prisma.encounter.findFirst({
            where: { id: encounterId, clinicId },
        });

        if (!encounter) {
            throw new NotFoundException('Atendimento não encontrado');
        }

        // Check if encounter is OPEN
        if (encounter.status === 'CLOSED') {
            throw new ForbiddenException(
                'Não é possível adicionar anexos a um atendimento fechado',
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            throw new BadRequestException(
                'Arquivo muito grande. Tamanho máximo: 10MB',
            );
        }

        // Validate mime type
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new BadRequestException(
                'Tipo de arquivo não permitido. Permitidos: PDF, JPG, PNG',
            );
        }

        // Generate unique filename
        const ext = path.extname(file.originalname);
        const filename = `${uuidv4()}${ext}`;

        // Create storage path
        const storagePath = path.join(
            UPLOAD_BASE_PATH,
            'clinics',
            clinicId,
            'encounters',
            encounterId,
        );

        // Ensure directory exists
        await fs.promises.mkdir(storagePath, { recursive: true });

        // Write file
        const filePath = path.join(storagePath, filename);
        await fs.promises.writeFile(filePath, file.buffer);

        // Create database record
        const attachment = await this.prisma.encounterAttachment.create({
            data: {
                clinicId,
                encounterId,
                filename,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                storagePath: filePath,
                uploadedById: userId,
            },
            include: {
                uploadedBy: { select: { id: true, name: true } },
            },
        });

        // Audit log
        await this.auditService.log({
            clinicId,
            userId,
            action: AuditAction.CREATE,
            entity: 'EncounterAttachment',
            entityId: attachment.id,
            message: 'encounter.attachment.uploaded',
        });

        return attachment;
    }

    async downloadAttachment(
        encounterId: string,
        attachmentId: string,
        clinicId: string,
        userId: string,
    ) {
        // Validate encounter exists and belongs to clinic
        const encounter = await this.prisma.encounter.findFirst({
            where: { id: encounterId, clinicId },
        });

        if (!encounter) {
            throw new NotFoundException('Atendimento não encontrado');
        }

        // Get attachment
        const attachment = await this.prisma.encounterAttachment.findFirst({
            where: { id: attachmentId, encounterId, clinicId },
        });

        if (!attachment) {
            throw new NotFoundException('Anexo não encontrado');
        }

        // Check if file exists
        if (!fs.existsSync(attachment.storagePath)) {
            throw new NotFoundException('Arquivo não encontrado no sistema');
        }

        // Audit log
        await this.auditService.log({
            clinicId,
            userId,
            action: AuditAction.VIEW,
            entity: 'EncounterAttachment',
            entityId: attachment.id,
            message: 'encounter.attachment.downloaded',
        });

        return {
            path: attachment.storagePath,
            filename: attachment.originalName,
            mimeType: attachment.mimeType,
        };
    }
}
