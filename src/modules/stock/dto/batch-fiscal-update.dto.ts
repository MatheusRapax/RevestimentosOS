import {
  IsString,
  IsNotEmpty,
  IsOptional,
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
}

export class BatchFiscalUpdateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FiscalUpdateItemDto)
  updates: FiscalUpdateItemDto[];
}
