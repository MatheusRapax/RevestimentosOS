import { IsString, IsOptional, Matches } from 'class-validator';

export class CreateBlockDto {
    @IsOptional()
    @IsString()
    professionalId?: string;

    @IsString()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
    date: string;

    @IsOptional()
    @IsString()
    @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be HH:MM' })
    startTime?: string;

    @IsOptional()
    @IsString()
    @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be HH:MM' })
    endTime?: string;

    @IsOptional()
    @IsString()
    reason?: string;
}
