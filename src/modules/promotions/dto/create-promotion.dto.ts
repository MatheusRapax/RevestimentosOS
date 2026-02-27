import { IsString, IsOptional, IsNumber, IsDateString, IsBoolean, IsArray, IsUUID } from 'class-validator';

export class CreatePromotionDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNumber()
    discountPercent: number;

    @IsDateString()
    startDate: string;

    @IsDateString()
    endDate: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsArray()
    @IsUUID('all', { each: true })
    productIds: string[];
}
