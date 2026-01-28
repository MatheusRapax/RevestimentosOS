import {
    IsString,
    IsUUID,
    IsDateString,
    IsOptional,
    MaxLength,
    ValidateIf,
} from 'class-validator';

export class CreateAppointmentDto {
    @IsUUID()
    patientId: string;

    @IsUUID()
    professionalId: string;

    @IsDateString()
    startAt: string;

    @IsDateString()
    endAt: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    room?: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    notes?: string;
}
