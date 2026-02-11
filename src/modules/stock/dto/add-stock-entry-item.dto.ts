import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export class AddStockEntryItemDto {
    @IsString()
    productId: string;

    @IsNumber()
    @Min(0.01)
    quantity: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    unitCost?: number;

    @IsString()
    @IsOptional()
    lotNumber?: string;

    @IsDateString()
    @IsOptional()
    expirationDate?: string;

    @IsString()
    @IsOptional()
    manufacturer?: string;

    // --- Fiscal Classification ---
    @IsString()
    @IsOptional()
    ncm?: string;

    @IsString()
    @IsOptional()
    cfop?: string;

    @IsString()
    @IsOptional()
    cst?: string;

    // --- Fiscal Values ---
    @IsNumber()
    @IsOptional()
    discountValueCents?: number;

    @IsNumber()
    @IsOptional()
    freightValueCents?: number;

    @IsNumber()
    @IsOptional()
    insuranceValueCents?: number;

    @IsNumber()
    @IsOptional()
    valueICMS?: number;

    @IsNumber()
    @IsOptional()
    rateICMS?: number;

    @IsNumber()
    @IsOptional()
    valueIPI?: number;

    @IsNumber()
    @IsOptional()
    rateIPI?: number;
}
