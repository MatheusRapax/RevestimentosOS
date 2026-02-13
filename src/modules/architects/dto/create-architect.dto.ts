import {
    IsString,
    IsEmail,
    IsOptional,
    IsNumber,
    MinLength,
    MaxLength,
    Min,
    Max,
    IsDateString,
} from 'class-validator';

export class CreateArchitectDto {
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    name: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    phone?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    document?: string; // CPF

    @IsOptional()
    @IsDateString()
    birthDate?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    commissionRate?: number; // Percentual (ex: 3.0 = 3%)

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    notes?: string;
}
