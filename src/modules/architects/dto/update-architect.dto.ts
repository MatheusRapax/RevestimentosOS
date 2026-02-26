import { PartialType } from '@nestjs/mapped-types';
import { CreateArchitectDto } from './create-architect.dto';

export class UpdateArchitectDto extends PartialType(CreateArchitectDto) {}
