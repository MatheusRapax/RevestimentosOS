import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * O que transferir e para quem. A seleção vem de uma destas fontes (ou das duas juntas):
 * - `quoteIds` / `orderIds`: documentos escolhidos um a um;
 * - `deVendedorId`: todas as vendas EM ABERTO de um vendedor (para quando alguém sai da loja).
 */
export class TransferirVendasDto {
  @IsUUID()
  paraVendedorId: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  quoteIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  orderIds?: string[];

  @IsOptional()
  @IsUUID()
  deVendedorId?: string;

  /** Obrigatório ao executar (mínimo de 5 caracteres); a prévia não exige. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;

  /** Confirma que sabe que pedido de mês anterior muda a comissão de um período já passado. */
  @IsOptional()
  @IsBoolean()
  confirmarMesAnterior?: boolean;
}
