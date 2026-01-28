import {
    IsString,
    IsOptional,
    IsNumber,
    Min,
    MaxLength,
} from 'class-validator';

export class AddConsumableDto {
    @IsString()
    @MaxLength(255)
    itemName: string;

    @IsOptional()
    @IsNumber()
    @Min(0.01)
    quantity?: number;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    unit?: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    notes?: string;

    @IsOptional()
    @IsString()
    productId?: string;
}
