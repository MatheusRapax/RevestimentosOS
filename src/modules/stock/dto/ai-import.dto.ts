import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';

export enum AmbiguityType {
  MULTIPLE_PRICES = 'MULTIPLE_PRICES',
  UNKNOWN_UNIT = 'UNKNOWN_UNIT',
  MERGED_DATA = 'MERGED_DATA',
}

export class AmbiguityOptionDto {
  @IsString()
  label: string;

  @IsString()
  column: string;

  @IsString()
  sampleValue: string;
}

export class AmbiguityResolutionDto {
  @IsEnum(AmbiguityType)
  type: AmbiguityType;

  @IsString()
  chosenOption: string;
}

export class AIColumnMappingDto {
  @IsString()
  @IsOptional()
  sku: string | null;

  @IsString()
  @IsOptional()
  name: string | null;

  @IsString()
  @IsOptional()
  cost: string | null;

  @IsString()
  @IsOptional()
  unit: string | null;

  @IsString()
  @IsOptional()
  format: string | null;

  @IsString()
  @IsOptional()
  m2PerBox: string | null;

  @IsString()
  @IsOptional()
  piecesPerBox: string | null;

  @IsString()
  @IsOptional()
  weight: string | null;

  @IsString()
  @IsOptional()
  palletBoxes: string | null;

  @IsString()
  @IsOptional()
  ncm: string | null;

  @IsString()
  @IsOptional()
  cest: string | null;

  @IsString()
  @IsOptional()
  cfop: string | null;

  @IsString()
  @IsOptional()
  cst: string | null;

  @IsString()
  @IsOptional()
  ean: string | null;

  @IsString()
  @IsOptional()
  height: string | null;

  @IsString()
  @IsOptional()
  width: string | null;

  @IsString()
  @IsOptional()
  depth: string | null;
}

export class AIRemappingRequestDto {
  @IsString()
  sessionId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AmbiguityResolutionDto)
  resolutions: AmbiguityResolutionDto[];
}

export class AIClassifiedItemDto {
  @IsNumber()
  index: number;

  @IsEnum(['M2', 'UN', 'CX', 'ML', 'PC'])
  unit: 'M2' | 'UN' | 'CX' | 'ML' | 'PC';

  @IsNumber()
  confidence: number;

  @IsString()
  @IsOptional()
  extractedFormat?: string;

  @IsString()
  @IsOptional()
  extractedUsage?: string;

  @IsString()
  @IsOptional()
  reasoning?: string;
}
