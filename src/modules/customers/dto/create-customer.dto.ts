import {
    IsString,
    IsEmail,
    IsOptional,
    IsEnum,
    IsInt,
    MinLength,
    MaxLength,
    Min,
    IsDateString,
} from 'class-validator';
import { CustomerType } from '@prisma/client';

export class CreateCustomerDto {
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    name: string;

    @IsOptional()
    @IsEnum(CustomerType)
    type?: CustomerType;

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
    document?: string; // CPF ou CNPJ

    @IsOptional()
    @IsString()
    @MaxLength(20)
    stateRegistration?: string; // Inscrição Estadual (PJ)

    @IsOptional()
    @IsDateString()
    birthDate?: string;

    // Endereço
    @IsOptional()
    @IsString()
    @MaxLength(255)
    address?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    addressNumber?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    complement?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    neighborhood?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    city?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2)
    state?: string;

    @IsOptional()
    @IsString()
    @MaxLength(10)
    zipCode?: string;

    // Arquiteto vinculado
    @IsOptional()
    @IsString()
    architectId?: string;

    // Limite de crédito em centavos
    @IsOptional()
    @IsInt()
    @Min(0)
    creditLimitCents?: number;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    notes?: string;
}
