import { IsString, IsOptional, IsDateString, IsEnum, IsNumber } from 'class-validator';
import { EntryType } from '@prisma/client';

export class CreateStockEntryDto {
    @IsEnum(EntryType)
    @IsOptional()
    type?: EntryType;

    @IsString()
    @IsOptional()
    invoiceNumber?: string;

    @IsString()
    @IsOptional()
    series?: string;

    @IsString()
    @IsOptional()
    supplierId?: string;

    @IsString()
    @IsOptional()
    supplierName?: string;

    @IsDateString()
    @IsOptional()
    emissionDate?: string;

    @IsDateString()
    @IsOptional()
    arrivalDate?: string;

    @IsString()
    @IsOptional()
    notes?: string;
}
