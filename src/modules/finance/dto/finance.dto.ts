import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsPositive,
  IsOptional,
  IsDateString,
  IsIn,
  IsUUID,
} from 'class-validator';

export class CreateServiceInvoiceDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsInt()
  @IsPositive()
  amountCents: number;

  @IsDateString()
  dueDate: string;

  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @IsOptional()
  @IsString()
  providerDocument?: string;

  @IsOptional()
  @IsString()
  providerName?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class GenerateInvoiceDto {
  @IsUUID()
  orderId: string;

  @IsDateString()
  dueDate: string;
}

export class UpdateInvoiceStatusDto {
  @IsIn(['PAID', 'CANCELLED'])
  status: 'PAID' | 'CANCELLED';
}
