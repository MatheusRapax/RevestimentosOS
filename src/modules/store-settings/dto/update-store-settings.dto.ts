import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateStoreSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultDeliveryFee?: number;
}
