import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsPositive,
  IsDateString,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ExpenseType } from '@prisma/client';

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsInt()
  @IsPositive()
  amountCents: number;

  @IsDateString()
  dueDate: string;

  @IsEnum(ExpenseType)
  type: ExpenseType;

  @IsOptional()
  @IsString()
  barCode?: string;

  @IsOptional()
  @IsString()
  recipientName?: string;

  @IsOptional()
  @IsString()
  purchaseOrderId?: string;
}
