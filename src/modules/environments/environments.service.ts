import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';

@Injectable()
export class EnvironmentsService {
  constructor(private prisma: PrismaService) {}

  async create(clinicId: string, createEnvironmentDto: CreateEnvironmentDto) {
    return this.prisma.environment.create({
      data: {
        clinicId,
        name: createEnvironmentDto.name,
        isActive: createEnvironmentDto.isActive ?? true,
      },
    });
  }

  async findAll(clinicId: string) {
    return this.prisma.environment.findMany({
      where: { clinicId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, clinicId: string) {
    const environment = await this.prisma.environment.findFirst({
      where: { id, clinicId },
    });

    if (!environment) {
      throw new NotFoundException(`Environment with ID ${id} not found`);
    }

    return environment;
  }

  async update(id: string, clinicId: string, updateEnvironmentDto: UpdateEnvironmentDto) {
    await this.findOne(id, clinicId);

    return this.prisma.environment.update({
      where: { id },
      data: updateEnvironmentDto,
    });
  }

  async remove(id: string, clinicId: string) {
    await this.findOne(id, clinicId);

    return this.prisma.environment.delete({
      where: { id },
    });
  }
}
