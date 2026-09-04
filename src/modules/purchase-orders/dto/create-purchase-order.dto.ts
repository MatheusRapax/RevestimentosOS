import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  ArrayMinSize,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PurchaseOrderItemDto {
  @IsString()
  @MinLength(1)
  productId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  productCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  productName?: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsInt()
  @Min(0)
  unitPriceCents: number;

  @IsInt()
  @Min(0)
  totalCents: number;
}

export class CreatePurchaseOrderDto {
  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  supplierName: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  supplierCnpj?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  supplierEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  supplierPhone?: string;

  @IsOptional()
  @IsString()
  salesOrderId?: string;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsInt()
  @Min(0)
  subtotalCents: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  shippingCents?: number;

  @IsInt()
  @Min(0)
  totalCents: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}
