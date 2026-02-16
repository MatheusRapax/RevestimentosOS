import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateCategoryDto {
    @IsString()
    name: string;

    @IsNumber()
    @IsOptional()
    defaultMarkup?: number;
}

export class UpdateCategoryDto {
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
