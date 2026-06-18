import {
  IsString,
  IsArray,
  IsOptional,
  ValidateNested,
  IsNumber,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ImportProductItemDto {
  @IsString()
  sku: string;

  @IsString()
  @IsOptional()
  supplierCode?: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  saleType?: string;

  @IsString()
  @IsOptional()
  format?: string;

  @IsString()
  @IsOptional()
  line?: string;

  @IsString()
  @IsOptional()
  usage?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  boxCoverage?: number;

  @IsNumber()
  @IsOptional()
  piecesPerBox?: number;

  @IsNumber()
  @IsOptional()
  palletBoxes?: number;

  @IsNumber()
  @IsOptional()
  palletCoverage?: number;

  @IsNumber()
  @IsOptional()
  boxWeight?: number;

  @IsNumber()
  costCents: number;

  @IsNumber()
  @IsOptional()
  costPerM2Cents?: number;

  @IsNumber()
  @IsOptional()
  height?: number;

  @IsNumber()
  @IsOptional()
  width?: number;

  @IsNumber()
  @IsOptional()
  depth?: number;

  @IsBoolean()
  @IsOptional()
  isNew?: boolean;
}

export class ImportProductsDto {
  @IsString()
  supplierId: string;

  @IsString()
  @IsOptional()
  clinicId?: string; // Required for super admin, optional for clinic users

  @IsString()
  @IsOptional()
  strategy?: string; // Layout strategy

  @IsString()
  @IsOptional()
  brandName?: string; // Selected Brand

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportProductItemDto)
  items: ImportProductItemDto[];
}
