import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { DeliveryStatus } from '@prisma/client';

export class CreateDeliveryDto {
    @IsNotEmpty()
    @IsString()
    orderId: string;

    @IsOptional()
    @IsDateString()
    scheduledDate?: string;

    @IsOptional()
    @IsString()
    driverName?: string;

    @IsOptional()
    @IsString()
    vehiclePlate?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}

export class UpdateDeliveryDto {
    @IsOptional()
    @IsEnum(DeliveryStatus)
    status?: DeliveryStatus;

    @IsOptional()
    @IsDateString()
    scheduledDate?: string;

    @IsOptional()
    @IsString()
    driverName?: string;

    @IsOptional()
    @IsString()
    vehiclePlate?: string;

    @IsOptional()
    @IsString()
    trackingCode?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}
