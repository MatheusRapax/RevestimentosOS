import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateNoticeDto {
    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    content?: string;

    @IsOptional()
    @IsIn(['low', 'normal', 'high', 'urgent'])
    priority?: string;

    @IsOptional()
    @IsString()
    expiresAt?: string;
}

export class UpdateNoticeDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    content?: string;

    @IsOptional()
    @IsIn(['low', 'normal', 'high', 'urgent'])
    priority?: string;

    @IsOptional()
    @IsString()
    expiresAt?: string;
}
