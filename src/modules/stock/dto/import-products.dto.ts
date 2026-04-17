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
  format?: string;

  @IsString()
  @IsOptional()
  line?: string;

  @IsString()
  @IsOptional()
  usage?: string;

  @IsNumber()
  @IsOptional()
  boxCoverage?: number;

  @IsInt()
  @IsOptional()
  piecesPerBox?: number;

  @IsInt()
  @IsOptional()
  palletBoxes?: number;

  @IsNumber()
  @IsOptional()
  boxWeight?: number;

  @IsNumber()
  costCents: number;

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
  strategy?: string; // Automatically associates layout strategy to Brand

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportProductItemDto)
  items: ImportProductItemDto[];
}
