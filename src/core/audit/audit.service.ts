import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

interface AuditLogData {
    clinicId?: string;
    userId?: string;
    action: AuditAction;
    entity: string;
    entityId?: string;
    message?: string;
    details?: any;
    ip?: string;
    userAgent?: string;
}

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(private prisma: PrismaService) { }

    async log(data: AuditLogData): Promise<void> {
        try {
            await this.prisma.auditLog.create({
                data: {
                    clinicId: data.clinicId,
                    userId: data.userId,
                    action: data.action,
                    entity: data.entity,
                    entityId: data.entityId,
                    message: data.message,
                    details: data.details,
                    ip: data.ip,
                    userAgent: data.userAgent,
                },
            });
        } catch (error) {
            // Never throw - audit failures should not break the application
            this.logger.error(`Failed to create audit log: ${error.message}`, error.stack);
        }
    }

    async findAll(
        clinicId: string,
        filters?: {
            userId?: string;
            action?: AuditAction;
            entity?: string;
            dateFrom?: Date;
            dateTo?: Date;
        },
    ) {
        const where: any = { clinicId };

        if (filters?.userId) {
            where.userId = filters.userId;
        }

        if (filters?.action) {
            where.action = filters.action;
        }

        if (filters?.entity) {
            where.entity = filters.entity;
        }

        if (filters?.dateFrom || filters?.dateTo) {
            where.createdAt = {};
            if (filters.dateFrom) {
                where.createdAt.gte = filters.dateFrom;
            }
            if (filters.dateTo) {
                where.createdAt.lte = filters.dateTo;
            }
        }

        return this.prisma.auditLog.findMany({
            where,
            orderBy: {
                createdAt: 'desc',
            },
            take: 100, // Limit for performance
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    }
}
