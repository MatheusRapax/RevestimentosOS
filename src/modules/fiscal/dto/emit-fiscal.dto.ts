import { IsString, IsNotEmpty } from 'class-validator';

export class EmitFiscalDto {
    @IsString()
    @IsNotEmpty()
    orderId: string;
}
