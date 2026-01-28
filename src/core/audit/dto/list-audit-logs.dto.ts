import { IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';
import { AuditAction } from '@prisma/client';

export class ListAuditLogsDto {
    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsEnum(AuditAction)
    action?: AuditAction;

    @IsOptional()
    @IsString()
    entity?: string;

    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @IsOptional()
    @IsDateString()
    dateTo?: string;
}
