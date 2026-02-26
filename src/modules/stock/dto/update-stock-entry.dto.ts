import { PartialType } from '@nestjs/mapped-types';
import { CreateStockEntryDto } from './create-stock-entry.dto';

export class UpdateStockEntryDto extends PartialType(CreateStockEntryDto) {}
