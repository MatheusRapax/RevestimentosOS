import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateBrandDto {
    @IsString()
    name: string;

    @IsNumber()
    @IsOptional()
    defaultMarkup?: number;
}

export class UpdateBrandDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsNumber()
    @IsOptional()
    defaultMarkup?: number;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
