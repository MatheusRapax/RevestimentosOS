import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateBrandDto, UpdateBrandDto } from '../dto/brand.dto';
import { PricingService } from './pricing.service';

@Injectable()
export class BrandsService {
  constructor(
    private prisma: PrismaService,
    private pricingService: PricingService,
  ) {}

  async create(clinicId: string, dto: CreateBrandDto) {
    return this.prisma.brand.create({
      data: {
        ...dto,
        clinicId,
      },
    });
  }

  async findAll(clinicId: string) {
    return this.prisma.brand.findMany({
      where: { clinicId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, clinicId: string) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, clinicId },
    });
    if (!brand) throw new NotFoundException('Marca não encontrada');
    return brand;
  }

  async update(id: string, clinicId: string, dto: UpdateBrandDto) {
    // findFirst com clinicId garante que a marca pertence a esta clínica —
    // um update(where:{id}) sem esse filtro deixaria qualquer usuário
    // autenticado editar a marca de outra loja só sabendo o id.
    await this.findOne(id, clinicId);

    const brand = await this.prisma.brand.update({
      where: { id },
      data: dto,
    });

    // Markup padrão da marca mudou: recalcula o preço de venda de todos os
    // produtos dela que não têm preço manual. Sem isso, a mudança nunca
    // chega nos produtos já cadastrados (priceCents é um valor gravado, não
    // recalculado em cada leitura).
    if (dto.defaultMarkup !== undefined) {
      await this.pricingService.recalculatePrices(clinicId, { brandId: id });
    }

    return brand;
  }

  async remove(id: string, clinicId: string) {
    await this.findOne(id, clinicId);
    return this.prisma.brand.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
