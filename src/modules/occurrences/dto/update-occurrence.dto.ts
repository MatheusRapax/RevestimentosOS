import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OccurrenceStatus } from '@prisma/client';

export class UpdateOccurrenceStatusDto {
    @IsEnum(OccurrenceStatus)
    status: OccurrenceStatus;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    allocateToOrder?: boolean;
}
