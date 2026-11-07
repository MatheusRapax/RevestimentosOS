import { IsString, MaxLength, MinLength } from 'class-validator';

/** Justificativa do cancelamento: a SEFAZ exige de 15 a 255 caracteres. */
export class CancelDocumentDto {
  @IsString()
  @MinLength(15, {
    message: 'A justificativa precisa ter ao menos 15 caracteres.',
  })
  @MaxLength(255, {
    message: 'A justificativa pode ter no máximo 255 caracteres.',
  })
  justificativa: string;
}
