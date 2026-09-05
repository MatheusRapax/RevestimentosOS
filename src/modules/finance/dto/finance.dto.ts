import {
  IsString,
  IsInt,
  IsPositive,
  IsOptional,
  IsDateString,
  IsIn,
  IsUUID,
} from 'class-validator';

export class CreateServiceInvoiceDto {
  // Só o valor é obrigatório — os demais campos têm default no service
  // (não endurecer além do comportamento anterior).
  @IsInt()
  @IsPositive()
  amountCents: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

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
