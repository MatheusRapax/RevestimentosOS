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
  Max,
  ArrayMinSize,
} from 'class-validator';

export class CommissionTierDto {
  @IsNumber()
  @Min(0)
  minGoalAmount: number;

  @IsNumber()
  @Min(0)
  @Max(100)
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
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CommissionTierDto)
  tiers?: CommissionTierDto[];
}
