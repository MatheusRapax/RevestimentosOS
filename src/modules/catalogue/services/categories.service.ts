import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';
import { PricingService } from './pricing.service';

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private pricingService: PricingService,
  ) {}

  async create(clinicId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        ...dto,
        clinicId,
      },
    });
  }

  async findAll(clinicId: string) {
    return this.prisma.category.findMany({
      where: { clinicId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, clinicId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, clinicId },
    });
    if (!category) throw new NotFoundException('Categoria não encontrada');
    return category;
  }

  async update(id: string, clinicId: string, dto: UpdateCategoryDto) {
    // findFirst com clinicId garante que a categoria pertence a esta
    // clínica — um update(where:{id}) sem esse filtro deixaria qualquer
    // usuário autenticado editar a categoria de outra loja só sabendo o id.
    await this.findOne(id, clinicId);

    const category = await this.prisma.category.update({
      where: { id },
      data: dto,
    });

    // Markup padrão da categoria mudou: recalcula o preço de venda de todos
    // os produtos dela que não têm preço manual (mesmo raciocínio de
    // BrandsService.update).
    if (dto.defaultMarkup !== undefined) {
      await this.pricingService.recalculatePrices(clinicId, {
        categoryId: id,
      });
    }

    return category;
  }

  async remove(id: string, clinicId: string) {
    await this.findOne(id, clinicId);
    return this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
