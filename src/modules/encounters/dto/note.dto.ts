import {
    IsString,
    IsOptional,
    MaxLength,
} from 'class-validator';

export class CreateNoteDto {
    @IsOptional()
    @IsString()
    @MaxLength(10000)
    subjective?: string;

    @IsOptional()
    @IsString()
    @MaxLength(10000)
    objective?: string;

    @IsOptional()
    @IsString()
    @MaxLength(10000)
    assessment?: string;

    @IsOptional()
    @IsString()
    @MaxLength(10000)
    plan?: string;
}

export class UpdateNoteDto extends CreateNoteDto { }
