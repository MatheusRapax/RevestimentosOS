import {
    IsOptional,
    IsString,
    IsBoolean,
    IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CustomerType } from '@prisma/client';

export class ListCustomerDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    document?: string;

    @IsOptional()
    @IsEnum(CustomerType)
    type?: CustomerType;

    @IsOptional()
    @IsString()
    architectId?: string;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true' || value === true)
    isActive?: boolean;
}
