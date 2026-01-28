import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ListAppointmentDto {
    @IsDateString()
    startDate: string;

    @IsDateString()
    endDate: string;

    @IsOptional()
    @IsUUID()
    professionalId?: string;
}
