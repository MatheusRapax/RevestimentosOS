import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CloseEncounterDto {
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    summary?: string;
}
