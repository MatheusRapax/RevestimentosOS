import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { AuditAction } from '@prisma/client';
import { CreateNoticeDto, UpdateNoticeDto } from './dto/notice.dto';

@Injectable()
export class NoticesService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
    ) { }

    async findAll(clinicId: string) {
        return this.prisma.notice.findMany({
            where: {
                clinicId,
                isActive: true,
                OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
            },
            include: {
                createdBy: {
                    select: { name: true, email: true },
                },
            },
            orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        });
    }

    async findOne(id: string, clinicId: string) {
        const notice = await this.prisma.notice.findFirst({
            where: { id, clinicId },
            include: {
                createdBy: {
                    select: { name: true, email: true },
                },
            },
        });

        if (!notice) {
            throw new NotFoundException('Aviso não encontrado');
        }

        return notice;
    }

    async create(clinicId: string, userId: string, dto: CreateNoticeDto) {
        const notice = await this.prisma.notice.create({
            data: {
                clinicId,
                createdById: userId,
                title: dto.title,
                content: dto.content,
                priority: dto.priority || 'normal',
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
            },
        });

        await this.auditService.log({
            clinicId,
            userId,
            action: AuditAction.CREATE,
            entity: 'Notice',
            entityId: notice.id,
            message: `Aviso criado: ${notice.title}`,
        });

        return notice;
    }

    async update(
        id: string,
        clinicId: string,
        userId: string,
        dto: UpdateNoticeDto,
    ) {
        await this.findOne(id, clinicId);

        const notice = await this.prisma.notice.update({
            where: { id },
            data: {
                title: dto.title,
                content: dto.content,
                priority: dto.priority,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
            },
        });

        await this.auditService.log({
            clinicId,
            userId,
            action: AuditAction.UPDATE,
            entity: 'Notice',
            entityId: notice.id,
            message: `Aviso atualizado: ${notice.title}`,
        });

        return notice;
    }

    async remove(id: string, clinicId: string, userId: string) {
        await this.findOne(id, clinicId);

        await this.prisma.notice.update({
            where: { id },
            data: { isActive: false },
        });

        await this.auditService.log({
            clinicId,
            userId,
            action: AuditAction.DELETE,
            entity: 'Notice',
            entityId: id,
            message: 'Aviso removido',
        });

        return { success: true };
    }
}
