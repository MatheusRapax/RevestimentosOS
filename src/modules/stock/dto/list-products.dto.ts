import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  FILTROS_DE_ESTOQUE,
  FiltroDeEstoque,
} from '../services/stock-availability';

export class ListProductsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeAdhoc?: boolean;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  line?: string;

  @IsOptional()
  @IsString()
  usage?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  /**
   * Disponibilidade (estoque menos reservas ativas): 'available' (qualquer saldo), 'in_stock' (acima
   * do mínimo), 'low_stock' (no mínimo ou abaixo) ou 'out_of_stock' (sem saldo disponível).
   */
  @IsOptional()
  @IsIn(FILTROS_DE_ESTOQUE)
  status?: FiltroDeEstoque;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
