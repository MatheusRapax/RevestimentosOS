import { CommissionGoalPeriod, CommissionTargetType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';

export class CommissionTierDto {
  @IsNumber()
  @Min(0)
  minGoalAmount: number;

  @IsNumber()
  @Min(0)
  commissionRate: number;
}

export class CreateCommissionRuleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(CommissionTargetType)
  targetType: CommissionTargetType;

  @IsEnum(CommissionGoalPeriod)
  @IsOptional()
  goalPeriod?: CommissionGoalPeriod;

  @IsBoolean()
  @IsOptional()
  isGlobal?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CommissionTierDto)
  tiers?: CommissionTierDto[];
}
