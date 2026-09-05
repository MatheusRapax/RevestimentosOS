import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OccurrenceType, OccurrenceStatus } from '@prisma/client';

export class CreateOccurrenceItemDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  lotId?: string;

  // aceita fracionário (ex.: m² / caixa parcial); só barra zero e negativo
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  unitType?: string; // "CAIXA" ou "UNIDADE"
}

export class CreateOccurrenceDto {
  @IsEnum(OccurrenceType)
  type: OccurrenceType;

  @IsOptional()
  @IsEnum(OccurrenceStatus)
  status?: OccurrenceStatus;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @IsOptional()
  @IsString()
  stockEntryId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOccurrenceItemDto)
  items: CreateOccurrenceItemDto[];
}
