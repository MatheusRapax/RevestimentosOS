import { IsString, IsBoolean, IsOptional, IsInt, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateQuoteTemplateDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;

    // Dados da Empresa
    @IsOptional()
    @IsString()
    companyName?: string;

    @IsOptional()
    @IsString()
    companyLogo?: string;

    @IsOptional()
    @IsString()
    companyPhone?: string;

    @IsOptional()
    @IsString()
    companyEmail?: string;

    @IsOptional()
    @IsString()
    companyAddress?: string;

    @IsOptional()
    @IsString()
    companyCnpj?: string;

    // Dados Bancários
    @IsOptional()
    @IsString()
    bankName?: string;

    @IsOptional()
    @IsString()
    bankAgency?: string;

    @IsOptional()
    @IsString()
    bankAccount?: string;

    @IsOptional()
    @IsString()
    bankAccountHolder?: string;

    @IsOptional()
    @IsString()
    bankCnpj?: string;

    @IsOptional()
    @IsString()
    pixKey?: string;

    // Termos e Condições
    @IsOptional()
    @IsString()
    termsAndConditions?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    validityDays?: number;

    @IsOptional()
    @IsString()
    validityText?: string;

    // Prazo de entrega
    @IsOptional()
    @IsString()
    defaultDeliveryDays?: string;

    // Personalização Visual
    @IsOptional()
    @IsString()
    primaryColor?: string;

    @IsOptional()
    @IsString()
    accentColor?: string;

    @IsOptional()
    @IsBoolean()
    showSignatureLines?: boolean;

    @IsOptional()
    @IsBoolean()
    showBankDetails?: boolean;

    @IsOptional()
    @IsBoolean()
    showTerms?: boolean;

    // Rodapé
    @IsOptional()
    @IsString()
    footerText?: string;
}

export class UpdateQuoteTemplateDto extends PartialType(CreateQuoteTemplateDto) { }
