import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class AdjustStockDto {
    @IsString()
    @IsNotEmpty()
    productId: string;

    @IsString()
    @IsOptional()
    lotId?: string;

    @IsNumber()
    @IsNotEmpty()
    quantity: number; // Positive to add, negative to remove

    @IsString()
    @IsNotEmpty()
    reason: string;
}
