import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreateClinicDto {
    @IsString({ message: 'Nome deve ser uma string' })
    @IsNotEmpty({ message: 'Nome é obrigatório' })
    @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
    name: string;
}
