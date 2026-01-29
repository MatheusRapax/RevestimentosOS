import {
    IsString,
    IsOptional,
    IsNumber,
    Min,
    MaxLength,
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

    @IsOptional()
    @IsNumber()
    @Min(0.0001)
    boxCoverage?: number;
}
