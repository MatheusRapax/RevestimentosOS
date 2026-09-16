import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';

export interface PricingFactors {
  productMarkup: number | null;
  brandMarkup: number | null;
  categoryMarkup: number | null;
  globalMarkup: number;
  manualPrice: boolean;
}

export interface CalculatedPrice {
  priceCents: number;
  appliedMarkup: number;
  source: 'MANUAL' | 'PRODUCT' | 'BRAND' | 'CATEGORY' | 'GLOBAL';
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(private prisma: PrismaService) {}

  calculatePrice(costCents: number, factors: PricingFactors): CalculatedPrice {
    // 1. Manual Override
    if (factors.manualPrice) {
      return {
        priceCents: 0, // Should be preserved from input if manual, but here we calculate based on markup.
        // If manual, the service calling this should probably not overwrite the price, or pass the current price as 'cost'?
        // Actually, if manualPrice is true, this calculator might not be called, OR it returns the cost + 0 markup?
        // Let's assume if manualPrice is true, we return a special indicator or just 0 markup.
        // But the requirement says: "If manualPrice is true, ignores markup engine."
        // So the caller should check manualPrice before calling this, OR this returns specific metadata.
        appliedMarkup: 0,
        source: 'MANUAL',
      };
    }

    // 2. Hierarchy Logic
    let markup = factors.productMarkup;
    let source: 'PRODUCT' | 'BRAND' | 'CATEGORY' | 'GLOBAL' = 'PRODUCT';

    if (markup === null || markup === undefined) {
      markup = factors.brandMarkup;
      source = 'BRAND';
    }

    if (markup === null || markup === undefined) {
      markup = factors.categoryMarkup;
      source = 'CATEGORY';
    }

    if (markup === null || markup === undefined) {
      markup = factors.globalMarkup;
      source = 'GLOBAL';
    }

    // 3. Calculation
    // Price = Cost * (1 + Markup/100)
    // Cents integer math
    const multiplier = 1 + markup / 100;
    const priceCents = Math.round(costCents * multiplier);

    return {
      priceCents,
      appliedMarkup: markup,
      source,
    };
  }

  /**
   * Recalcula e persiste Product.priceCents para os produtos afetados por uma
   * mudança de markup (de marca, categoria ou global da loja). Produtos com
   * `manualPrice: true` nunca são tocados — o preço deles é uma decisão do
   * operador, não do motor de precificação.
   *
   * Sem isso, mudar o markup padrão de uma marca/categoria/loja não tem
   * nenhum efeito nos produtos já cadastrados: `priceCents` é um valor
   * gravado, não recalculado em cada leitura (ver stock.service.ts, que só
   * cai no cálculo por markup quando o preço salvo está zerado/ausente).
   *
   * @param where Filtro adicional além de `clinicId`/`manualPrice: false` —
   *   `{ brandId }`, `{ categoryId }` ou `{}` (loja inteira, no caso do
   *   markup global).
   * @returns quantos produtos tiveram o preço efetivamente alterado.
   */
  async recalculatePrices(
    clinicId: string,
    where: Prisma.ProductWhereInput = {},
  ): Promise<number> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { globalMarkup: true },
    });
    const globalMarkup = clinic?.globalMarkup ?? 40.0;

    const products = await this.prisma.product.findMany({
      where: {
        ...where,
        clinicId,
        manualPrice: false,
        isActive: true,
        costCents: { not: null },
      },
      include: { brand: true, category: true },
    });

    const updates: { id: string; priceCents: number }[] = [];
    for (const product of products) {
      const { priceCents } = this.calculatePrice(product.costCents ?? 0, {
        productMarkup: product.markup,
        brandMarkup: product.brand?.defaultMarkup ?? null,
        categoryMarkup: product.category?.defaultMarkup ?? null,
        globalMarkup,
        manualPrice: false,
      });
      if (priceCents !== product.priceCents) {
        updates.push({ id: product.id, priceCents });
      }
    }

    if (updates.length === 0) return 0;

    await this.prisma.$transaction(
      updates.map((u) =>
        this.prisma.product.update({
          where: { id: u.id },
          data: { priceCents: u.priceCents },
        }),
      ),
    );

    this.logger.log(
      `Recalculados ${updates.length} preço(s) de produto na clínica ${clinicId} (filtro: ${JSON.stringify(where)})`,
    );

    return updates.length;
  }
}
