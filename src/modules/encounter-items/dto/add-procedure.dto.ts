import {
    IsString,
    IsOptional,
    IsInt,
    Min,
    MaxLength,
} from 'class-validator';

export class AddProcedureDto {
    @IsString()
    @MaxLength(255)
    name: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    priceCents?: number;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    notes?: string;
}
