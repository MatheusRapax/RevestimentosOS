import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';

export class AddStockEntryItemDto {
    @IsString()
    productId: string;

    @IsNumber()
    @Min(0.01)
    quantity: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    unitCost?: number;

    @IsString()
    @IsOptional()
    lotNumber?: string;

    @IsDateString()
    @IsOptional()
    expirationDate?: string;

    @IsString()
    @IsOptional()
    manufacturer?: string;
}
