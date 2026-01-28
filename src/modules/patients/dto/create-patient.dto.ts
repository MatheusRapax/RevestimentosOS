import {
    IsString,
    IsEmail,
    IsOptional,
    IsDateString,
    MinLength,
    MaxLength,
} from 'class-validator';

export class CreatePatientDto {
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
    @MaxLength(50)
    document?: string;

    @IsOptional()
    @IsDateString()
    birthDate?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    gender?: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    notes?: string;
}
