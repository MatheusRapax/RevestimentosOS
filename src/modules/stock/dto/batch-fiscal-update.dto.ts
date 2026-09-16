import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsNumber,
  Min,
  Max,
  Matches,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FiscalUpdateItemDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{8}$/, { message: 'NCM deve ter 8 dígitos.' })
  ncm: string;

  @IsString()
  @IsNotEmpty()
  cfop: string;

  @IsString()
  @IsNotEmpty()
  cst: string;

  @IsString()
  @IsOptional()
  cest?: string;

  // Origem da mercadoria (0 a 8) — obrigatório na emissão da NF-e
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(8)
  origin?: number;

  @IsOptional()
  @IsString()
  gtin?: string;

  @IsOptional()
  @IsString()
  unidadeTributavel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  fatorConversao?: number;
}

export class BatchFiscalUpdateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FiscalUpdateItemDto)
  updates: FiscalUpdateItemDto[];
}
