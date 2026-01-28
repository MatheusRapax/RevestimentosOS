import { IsUUID, IsOptional } from 'class-validator';

export class StartEncounterDto {
    @IsUUID()
    patientId: string;

    @IsUUID()
    professionalId: string;

    @IsOptional()
    @IsUUID()
    appointmentId?: string;
}
