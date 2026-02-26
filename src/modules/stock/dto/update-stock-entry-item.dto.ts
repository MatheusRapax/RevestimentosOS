import { PartialType } from '@nestjs/mapped-types';
import { AddStockEntryItemDto } from './add-stock-entry-item.dto';

export class UpdateStockEntryItemDto extends PartialType(
  AddStockEntryItemDto,
) {}
