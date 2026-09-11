import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  Length,
  Matches,
} from 'class-validator';

/**
 * Perfil fiscal do emitente (a loja). Todos os campos opcionais no upsert —
 * o pré-flight de emissão é quem exige o conjunto completo.
 */
export class UpsertFiscalProfileDto {
  @IsOptional()
  @Matches(/^\d{14}$/, { message: 'CNPJ deve ter 14 dígitos.' })
  cnpj?: string;

  @IsOptional()
  @IsString()
  ie?: string;

  @IsOptional()
  @IsString()
  im?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  crt?: number;

  @IsOptional()
  @IsString()
  cnae?: string;

  @IsOptional()
  @IsString()
  logradouro?: string;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsString()
  complemento?: string;

  @IsOptional()
  @IsString()
  bairro?: string;

  @IsOptional()
  @Matches(/^\d{7}$/, { message: 'Código IBGE do município deve ter 7 dígitos.' })
  municipioIbge?: string;

  @IsOptional()
  @IsString()
  municipioNome?: string;

  @IsOptional()
  @Length(2, 2, { message: 'UF deve ter 2 letras.' })
  uf?: string;

  @IsOptional()
  @Matches(/^\d{8}$/, { message: 'CEP deve ter 8 dígitos.' })
  cep?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  serieNfe?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  serieNfce?: number;

  @IsOptional()
  @IsString()
  cscId?: string;

  @IsOptional()
  @IsString()
  cscToken?: string;
}
