import { IsString, IsEnum, IsObject } from 'class-validator';

export enum RecordType {
    ANAMNESIS = 'ANAMNESIS',
    EVOLUTION = 'EVOLUTION',
    NOTE = 'NOTE',
}

export class AddRecordDto {
    @IsEnum(RecordType)
    type: RecordType;

    @IsObject()
    content: Record<string, any>;
}
