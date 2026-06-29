import { IsOptional, IsString, IsInt, IsEnum } from 'class-validator';

export class UpdateFiscalSettingsDto {
  @IsOptional()
  @IsString()
  defaultNaturezaOperacao?: string;

  @IsOptional()
  @IsString()
  defaultTaxClass?: string;

  @IsOptional()
  @IsString()
  defaultNcm?: string;

  @IsOptional()
  @IsString()
  defaultCest?: string;

  @IsOptional()
  @IsString()
  defaultCfop?: string;

  @IsOptional()
  @IsString()
  defaultCst?: string;

  @IsOptional()
  @IsInt()
  defaultOrigin?: number;

  @IsOptional()
  @IsEnum(['1', '2'])
  environment?: string;
}
