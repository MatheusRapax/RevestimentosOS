import {
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  IsPositive,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus, PaymentMethod } from '@prisma/client';

export class OrderPaymentDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsInt()
  @IsPositive()
  amountCents: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  installments?: number;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderPaymentDto)
  payments?: OrderPaymentDto[];
}
