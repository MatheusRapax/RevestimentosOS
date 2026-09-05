import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { OrderStatus, TransactionType } from '@prisma/client';

// Widget types available for flooring store
export const WIDGET_TYPES = [
  'birthdays',
  'stock_alerts',
  'expenses_due',
  'pending_orders',
  'today_revenue',
  'pending_deliveries',
  'rma_alerts',
] as const;

export type WidgetType = (typeof WIDGET_TYPES)[number];

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // Get user's dashboard config for a clinic
  async getConfig(userId: string, clinicId: string) {
    const config = await this.prisma.userDashboardConfig.findUnique({
      where: {
        userId_clinicId: { userId, clinicId },
      },
    });

    return config?.widgets || [];
  }

  // Save user's dashboard config
  async saveConfig(userId: string, clinicId: string, widgets: string[]) {
    // Validate widget types
    const validWidgets = widgets.filter((w) =>
      WIDGET_TYPES.includes(w as WidgetType),
    );

    // Limit to 3 widgets
    const limitedWidgets = validWidgets.slice(0, 3);

    return this.prisma.userDashboardConfig.upsert({
      where: {
        userId_clinicId: { userId, clinicId },
      },
      create: {
        userId,
        clinicId,
        widgets: limitedWidgets,
      },
      update: {
        widgets: limitedWidgets,
      },
    });
  }

  // Get user's dashboard shortcuts
  async getShortcuts(userId: string, clinicId: string) {
    const config = await this.prisma.userDashboardConfig.findUnique({
      where: {
        userId_clinicId: { userId, clinicId },
      },
      select: { shortcuts: true },
    });

    return config?.shortcuts || [];
  }

  // Save user's dashboard shortcuts
  async saveShortcuts(userId: string, clinicId: string, shortcuts: string[]) {
    // Limit to let's say 12 shortcuts to prevent abuse
    const limitedShortcuts = shortcuts.slice(0, 12);

    return this.prisma.userDashboardConfig.upsert({
      where: {
        userId_clinicId: { userId, clinicId },
      },
      create: {
        userId,
        clinicId,
        widgets: [],
        shortcuts: limitedShortcuts,
      },
      update: {
        shortcuts: limitedShortcuts,
      },
    });
  }

  // Get birthdays widget data
  async getBirthdays(clinicId: string) {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const patients = await this.prisma.patient.findMany({
      where: {
        clinicId,
        isActive: true,
        birthDate: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        birthDate: true,
      },
    });

    // Filter patients with birthday today
    return patients.filter((p) => {
      if (!p.birthDate) return false;
      const bd = new Date(p.birthDate);
      return (
        bd.getMonth() === today.getMonth() && bd.getDate() === today.getDate()
      );
    });
  }

  // Get today's appointments
  async getTodayAppointments(clinicId: string) {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    return this.prisma.appointment.findMany({
      where: {
        clinicId,
        startAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          not: 'CANCELLED',
        },
      },
      include: {
        patient: {
          select: { name: true },
        },
        professional: {
          select: { name: true },
        },
      },
      orderBy: { startAt: 'asc' },
      take: 10,
    });
  }

  // Get stock alerts (products below minimum)
  async getStockAlerts(clinicId: string) {
    // Get all products with their stock lots
    const products = await this.prisma.product.findMany({
      where: {
        clinicId,
        isActive: true,
      },
    });

    // For each product, calculate total stock from lots
    const productsWithStock = await Promise.all(
      products.map(async (p) => {
        const lots = await this.prisma.stockLot.findMany({
          where: {
            productId: p.id,
            quantity: { gt: 0 },
          },
        });
        const totalStock = lots.reduce(
          (sum: number, lot) => sum + lot.quantity,
          0,
        );
        return {
          id: p.id,
          name: p.name,
          currentStock: totalStock,
          minStock: p.minStock,
          unit: p.unit,
          isLow: totalStock <= p.minStock,
        };
      }),
    );

    return productsWithStock.filter((p) => p.isLow);
  }

  // Get active notices
  async getNotices(clinicId: string) {
    return this.prisma.notice.findMany({
      where: {
        clinicId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    });
  }

  // Get open encounters
  async getOpenEncounters(clinicId: string) {
    return this.prisma.encounter.findMany({
      where: {
        clinicId,
        status: 'OPEN',
      },
      include: {
        patient: {
          select: { name: true },
        },
        professional: {
          select: { name: true },
        },
      },
      orderBy: { openedAt: 'desc' },
      take: 5,
    });
  }

  // Get lots expiring soon (next 30 days)
  async getUpcomingExpirations(clinicId: string) {
    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);

    return this.prisma.stockLot.findMany({
      where: {
        clinicId,
        quantity: { gt: 0 },
        expirationDate: {
          gte: now,
          lte: in30Days,
        },
      },
      include: {
        product: {
          select: { name: true, unit: true },
        },
      },
      orderBy: { expirationDate: 'asc' },
      take: 5,
    });
  }

  // ====================================================================
  // NEW WIDGETS FOR FLOORING STORE
  // ====================================================================

  // Get expenses due soon (next 7 days)
  async getExpensesDue(clinicId: string) {
    const now = new Date();
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);

    return this.prisma.expense.findMany({
      where: {
        clinicId,
        status: 'PENDING',
        dueDate: {
          gte: now,
          lte: in7Days,
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
    });
  }

  // Get pending orders (not delivered/cancelled)
  async getPendingOrders(clinicId: string) {
    return this.prisma.order.findMany({
      where: {
        clinicId,
        status: {
          in: [
            OrderStatus.CRIADO,
            OrderStatus.PAGO,
            OrderStatus.AGUARDANDO_COMPRA,
            OrderStatus.AGUARDANDO_MATERIAL, // legado/deprecado
            OrderStatus.PRONTO_PARA_ENTREGA,
          ],
        },
      },
      include: {
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  }

  // Get today's revenue summary
  async getTodayRevenue(clinicId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Faturamento = pagamentos EFETIVAMENTE recebidos hoje (não totais de pedidos não pagos)
    const payments = await this.prisma.transaction.findMany({
      where: {
        clinicId,
        type: TransactionType.PAYMENT,
        createdAt: { gte: today, lt: tomorrow },
      },
      select: { amountCents: true },
    });

    const totalCents = payments.reduce((sum, p) => sum + p.amountCents, 0);
    return { totalCents, count: payments.length };
  }

  // Get pending deliveries
  async getPendingDeliveries(clinicId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.order.findMany({
      where: {
        clinicId,
        status: {
          in: [
            OrderStatus.PAGO,
            OrderStatus.AGUARDANDO_COMPRA,
            OrderStatus.AGUARDANDO_MATERIAL, // legado/deprecado
            OrderStatus.PRONTO_PARA_ENTREGA,
          ],
        },
        deliveryDate: { gte: today },
      },
      include: {
        customer: { select: { name: true } },
      },
      orderBy: { deliveryDate: 'asc' },
      take: 5,
    });
  }

  // Get active RMAs
  async getRmaAlerts(clinicId: string) {
    return this.prisma.occurrence.findMany({
      where: {
        clinicId,
        status: {
          notIn: ['RESOLVIDO', 'RASCUNHO'],
        },
      },
      include: {
        supplier: { select: { name: true } },
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  }

  // ====================================================================
  // FINANCIAL REPORTS (PHASE 4)
  // ====================================================================

  /**
   * Resolve a regra de comissão aplicável (específica do alvo ou global ativa)
   * e devolve o % do tier correspondente ao volume de vendas do período.
   */
  private async resolveCommission(
    clinicId: string,
    targetType: 'SELLER' | 'ARCHITECT',
    specificRule: any,
    periodSalesCents: number,
  ): Promise<{ rule: any; percentage: number; commissionCents: number }> {
    const rule =
      specificRule ||
      (await this.prisma.commissionRule.findFirst({
        where: { clinicId, targetType, isGlobal: true, isActive: true },
        include: { tiers: { orderBy: { minGoalAmount: 'desc' } } },
      }));

    if (!rule || !rule.tiers || rule.tiers.length === 0) {
      return { rule: null, percentage: 0, commissionCents: 0 };
    }

    const tier =
      rule.tiers.find((t: any) => periodSalesCents >= t.minGoalAmount) ||
      rule.tiers[rule.tiers.length - 1];
    const percentage = tier ? tier.commissionRate : 0;
    return {
      rule,
      percentage,
      commissionCents: Math.round(periodSalesCents * (percentage / 100)),
    };
  }

  // Seller Performance Report
  async getSellersPerformance(
    clinicId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // 1. Vendedores: quem tem papel SELLER OU quem é sellerId de algum pedido/orçamento
    const [roleSellers, orderSellerIds, quoteSellerIds] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          clinicUsers: { some: { clinicId, role: { key: 'SELLER' } } },
        },
        select: { id: true, name: true, email: true },
      }),
      this.prisma.order.findMany({
        where: { clinicId },
        distinct: ['sellerId'],
        select: { sellerId: true },
      }),
      this.prisma.quote.findMany({
        where: { clinicId },
        distinct: ['sellerId'],
        select: { sellerId: true },
      }),
    ]);

    const sellerIds = new Set<string>(roleSellers.map((s) => s.id));
    for (const o of orderSellerIds) if (o.sellerId) sellerIds.add(o.sellerId);
    for (const q of quoteSellerIds) if (q.sellerId) sellerIds.add(q.sellerId);

    const sellers = await this.prisma.user.findMany({
      where: { id: { in: [...sellerIds] } },
      select: {
        id: true,
        name: true,
        email: true,
        commissionRule: {
          include: { tiers: { orderBy: { minGoalAmount: 'desc' } } },
        },
      },
    });

    const report = [];

    for (const seller of sellers) {
      // Aggregate Orders
      const orders = await this.prisma.order.findMany({
        where: {
          clinicId,
          sellerId: seller.id,
          createdAt:
            Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
          status: { notIn: [OrderStatus.CANCELADO, OrderStatus.RASCUNHO] },
        },
        select: { totalCents: true },
      });

      // Aggregate Quotes
      const quotesCount = await this.prisma.quote.count({
        where: {
          clinicId,
          sellerId: seller.id,
          createdAt:
            Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        },
      });

      const ordersCount = orders.length;
      const totalRevenue = orders.reduce((sum, o) => sum + o.totalCents, 0);
      const conversionRate =
        quotesCount > 0 ? (ordersCount / quotesCount) * 100 : 0;
      const averageTicket =
        ordersCount > 0 ? Math.round(totalRevenue / ordersCount) : 0;

      // Comissão real: regra específica do vendedor ou regra global ativa, com tiers.
      const {
        rule: sellerRule,
        percentage,
        commissionCents: commission,
      } = await this.resolveCommission(
        clinicId,
        'SELLER',
        (seller as any).commissionRule,
        totalRevenue,
      );

      report.push({
        id: seller.id,
        name: seller.name || 'Desconhecido',
        email: seller.email,
        stats: {
          ordersCount,
          quotesCount,
          conversionRate: Number(conversionRate.toFixed(1)),
          totalRevenue,
          averageTicket,
          commission,
          commissionPercentage: percentage,
          commissionRuleName: sellerRule?.name || null,
        },
        rank: 0, // Calculated after sorting
        trend: 0, // Requires previous period logic (omitted for MVP)
      });
    }

    // Rank by Revenue
    report.sort((a, b) => b.stats.totalRevenue - a.stats.totalRevenue);
    report.forEach((r, i) => (r.rank = i + 1));

    // Calculate Totals
    const totals = report.reduce(
      (acc, curr) => ({
        totalRevenue: acc.totalRevenue + curr.stats.totalRevenue,
        totalOrders: acc.totalOrders + curr.stats.ordersCount,
        totalQuotes: acc.totalQuotes + curr.stats.quotesCount,
        totalCommission: acc.totalCommission + curr.stats.commission,
      }),
      { totalRevenue: 0, totalOrders: 0, totalQuotes: 0, totalCommission: 0 },
    );

    const avgConversion =
      totals.totalQuotes > 0
        ? (totals.totalOrders / totals.totalQuotes) * 100
        : 0;

    return {
      sellers: report,
      totals: { ...totals, avgConversion: Number(avgConversion.toFixed(1)) },
    };
  }

  // Architect Commission Report
  async getArchitectsPerformance(
    clinicId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    const createdAt =
      Object.keys(dateFilter).length > 0 ? dateFilter : undefined;

    const architects = await this.prisma.architect.findMany({
      where: { clinicId, isActive: true },
      include: {
        commissionRule: {
          include: { tiers: { orderBy: { minGoalAmount: 'desc' } } },
        },
      },
    });

    const report = [];
    for (const arch of architects) {
      // Atribuição alinhada ao endpoint por pedido: venda indicada = orçamento do
      // arquiteto OU cliente cujo arquiteto padrão é este. Uma query dedupa por pedido.
      const orders = await this.prisma.order.findMany({
        where: {
          clinicId,
          createdAt,
          status: { notIn: [OrderStatus.CANCELADO, OrderStatus.RASCUNHO] },
          OR: [
            { quote: { architectId: arch.id } },
            { customer: { architectId: arch.id } },
          ],
        },
        select: { totalCents: true, customerId: true },
      });

      const totalSales = orders.reduce((s, o) => s + o.totalCents, 0);
      const clientsCount = new Set(orders.map((o) => o.customerId)).size;
      const {
        rule,
        percentage,
        commissionCents: commissionTotal,
      } = await this.resolveCommission(
        clinicId,
        'ARCHITECT',
        (arch as any).commissionRule,
        totalSales,
      );

      report.push({
        id: arch.id,
        name: arch.name,
        commissionRuleId: (arch as any).commissionRuleId,
        stats: {
          totalSales,
          clientsCount,
          commissionTotal,
          commissionPercentage: percentage,
          commissionRuleName: rule?.name || null,
        },
      });
    }

    return report.sort((a, b) => b.stats.totalSales - a.stats.totalSales);
  }
}
