import {
    IsString,
    IsNumber,
    IsDateString,
    Min,
    MaxLength,
    IsOptional,
} from 'class-validator';

export class AddStockDto {
    @IsString()
    productId: string;

    @IsString()
    @MaxLength(100)
    lotNumber: string;

    @IsNumber()
    @Min(0.01)
    quantity: number;

    @IsOptional()
    @IsDateString()
    expirationDate?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    invoiceNumber?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    supplier?: string;
}
