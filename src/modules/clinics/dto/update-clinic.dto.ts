import { PartialType } from '@nestjs/mapped-types';
import { CreateClinicDto } from './create-clinic.dto';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateClinicDto extends PartialType(CreateClinicDto) {
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1000)
    globalMarkup?: number;
}
