import { IsString, IsNotEmpty, IsArray, IsOptional, IsBoolean } from 'class-validator';

export class CreateTenantDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    slug: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    modules?: string[];

    @IsString()
    @IsOptional()
    logoUrl?: string;
}

export class UpdateTenantDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    slug?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    modules?: string[];

    @IsString()
    @IsOptional()
    logoUrl?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
