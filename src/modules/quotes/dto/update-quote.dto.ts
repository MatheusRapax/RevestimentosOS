import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateQuoteDto } from './create-quote.dto';

// Update não permite alterar items diretamente (use endpoints específicos)
export class UpdateQuoteDto extends PartialType(
    OmitType(CreateQuoteDto, ['items'] as const),
) { }
