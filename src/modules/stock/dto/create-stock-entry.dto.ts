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

    // --- Fiscal Data ---
    @IsString()
    @IsOptional()
    accessKey?: string;

    @IsString()
    @IsOptional()
    operationNature?: string;

    @IsString()
    @IsOptional()
    protocol?: string;

    @IsString()
    @IsOptional()
    model?: string;

    // --- Totals ---
    @IsNumber()
    @IsOptional()
    calculationBaseICMS?: number;

    @IsNumber()
    @IsOptional()
    valueICMS?: number;

    @IsNumber()
    @IsOptional()
    calculationBaseICMSST?: number;

    @IsNumber()
    @IsOptional()
    valueICMSST?: number;

    @IsNumber()
    @IsOptional()
    totalProductsValueCents?: number;

    @IsNumber()
    @IsOptional()
    freightValueCents?: number;

    @IsNumber()
    @IsOptional()
    insuranceValueCents?: number;

    @IsNumber()
    @IsOptional()
    discountValueCents?: number;

    @IsNumber()
    @IsOptional()
    otherExpensesValueCents?: number;

    @IsNumber()
    @IsOptional()
    totalIPIValueCents?: number;

    // --- Transport ---
    @IsNumber()
    @IsOptional()
    freightType?: number;

    @IsString()
    @IsOptional()
    carrierName?: string;

    @IsString()
    @IsOptional()
    carrierDocument?: string;

    @IsString()
    @IsOptional()
    carrierPlate?: string;

    @IsString()
    @IsOptional()
    carrierState?: string;

    // --- Volumes ---
    @IsNumber()
    @IsOptional()
    volumeQuantity?: number;

    @IsString()
    @IsOptional()
    volumeSpecies?: string;

    @IsNumber()
    @IsOptional()
    grossWeight?: number;

    @IsNumber()
    @IsOptional()
    netWeight?: number;
}
