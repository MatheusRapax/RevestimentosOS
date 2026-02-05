import {
    IsString,
    IsOptional,
    IsNumber,
    Min,
    MaxLength,
    IsInt,
} from 'class-validator';

export class CreateProductDto {
    @IsString()
    @MaxLength(255)
    name: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    unit?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    sku?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    barcode?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    minStock?: number;

    // Product classification
    @IsOptional()
    @IsString()
    @MaxLength(50)
    format?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    line?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    usage?: string;

    // Packaging information
    @IsOptional()
    @IsNumber()
    @Min(0.0001)
    boxCoverage?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    piecesPerBox?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    boxWeight?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    palletBoxes?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    palletWeight?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    palletCoverage?: number;

    // Pricing
    @IsOptional()
    @IsInt()
    @Min(0)
    costCents?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    priceCents?: number;

    // Supplier reference
    @IsOptional()
    @IsString()
    @MaxLength(100)
    supplierCode?: string;
}
