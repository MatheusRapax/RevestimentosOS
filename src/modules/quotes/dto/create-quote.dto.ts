import {
    IsString,
    IsOptional,
    IsNumber,
    IsInt,
    IsDateString,
    IsArray,
    ValidateNested,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuoteItemDto {
    @IsString()
    productId: string;

    // Input: área desejada em m² (opcional se informar caixas diretamente)
    @IsOptional()
    @IsNumber()
    @Min(0)
    inputArea?: number;

    // Quantidade de caixas (pode ser calculada via inputArea ou inserida manualmente)
    @IsOptional()
    @IsInt()
    @Min(1)
    quantityBoxes?: number;

    // Preço por unidade (m² ou caixa) em centavos
    @IsInt()
    @Min(0)
    unitPriceCents: number;

    // Desconto por item
    @IsOptional()
    @IsInt()
    @Min(0)
    discountCents?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    discountPercent?: number;

    // Lote preferido (opcional)
    @IsOptional()
    @IsString()
    preferredLotId?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class CreateQuoteDto {
    @IsString()
    customerId: string;

    @IsOptional()
    @IsString()
    architectId?: string;

    @IsOptional()
    @IsDateString()
    validUntil?: string;

    // Desconto global
    @IsOptional()
    @IsInt()
    @Min(0)
    discountCents?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    discountPercent?: number;

    // Taxa de entrega (aceita ambos os nomes para compatibilidade)
    @IsOptional()
    @IsInt()
    @Min(0)
    deliveryFee?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    deliveryFeeCents?: number;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsString()
    internalNotes?: string;

    // Items do orçamento
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateQuoteItemDto)
    items: CreateQuoteItemDto[];
}
