
import { PartialType } from '@nestjs/mapped-types';
import { CreateQuoteItemDto } from './create-quote.dto';

export class UpdateQuoteItemDto extends PartialType(CreateQuoteItemDto) { }
