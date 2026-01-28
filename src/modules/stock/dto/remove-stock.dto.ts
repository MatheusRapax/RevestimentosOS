import {
    IsString,
    IsNumber,
    IsOptional,
    Min,
    MaxLength,
} from 'class-validator';

export class RemoveStockDto {
    @IsString()
    productId: string;

    @IsNumber()
    @Min(0.01)
    quantity: number;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;

    @IsOptional()
    @IsString()
    destinationType?: string;

    @IsOptional()
    @IsString()
    destinationName?: string;

    @IsOptional()
    @IsString()
    encounterId?: string;
}
