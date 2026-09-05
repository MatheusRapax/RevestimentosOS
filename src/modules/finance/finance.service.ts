import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import {
  AuditAction,
  TransactionType,
  OrderStatus,
  QuoteStatus,
  ExpenseStatus,
  ExpenseType,
  PaymentMethod,
  Prisma,
} from '@prisma/client';

/** Cliente Prisma normal ou o handle de uma transação em andamento. */
type PrismaLike = PrismaService | Prisma.TransactionClient;
import { startOfMonth, endOfMonth, subMonths, format, subDays } from 'date-fns';

@Injectable()
export class FinanceService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Get or create patient/customer account
   */
  async getOrCreateAccount(
    clinicId: string,
    patientId?: string | null,
    customerId?: string | null,
    tx?: PrismaLike,
  ) {
    if (!patientId && !customerId) {
      throw new BadRequestException('ID do Paciente ou Cliente é obrigatório');
    }

    const db = tx ?? this.prisma;
    let account;

    if (patientId) {
      account = await db.patientAccount.findUnique({
        where: { patientId },
      });
    } else if (customerId) {
      account = await db.patientAccount.findUnique({
        where: { customerId },
      });
    }

    if (!account) {
      account = await db.patientAccount.create({
        data: {
          clinicId,
          patientId: patientId || undefined,
          customerId: customerId || undefined,
        },
      });
    }

    return account;
  }

  /**
   * Get patient account with transactions
   */
  async getPatientAccount(clinicId: string, patientId: string) {
    // Validate patient belongs to clinic
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, clinicId },
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado');
    }

    const account = await this.getOrCreateAccount(clinicId, patientId);

    const transactions = await this.prisma.transaction.findMany({
      where: { accountId: account.id },
      include: {
        encounter: {
          select: { id: true, date: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      patientId,
      patientName: patient.name,
      balanceCents: account.balanceCents,
      balanceFormatted: this.formatCurrency(account.balanceCents),
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amountCents: t.amountCents,
        amountFormatted: this.formatCurrency(t.amountCents),
        description: t.description,
        encounterId: t.encounterId,
        encounterDate: t.encounter?.date,
        createdAt: t.createdAt,
      })),
    };
  }

  /**
   * Conta-corrente de um cliente de venda (B2B).
   * Mesma forma de resposta que getPatientAccount, resolvendo Customer.
   */
  async getCustomerAccount(clinicId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, clinicId },
    });

    if (!customer) {
      throw new NotFoundException('Cliente não encontrado');
    }

    const account = await this.getOrCreateAccount(clinicId, null, customerId);

    const transactions = await this.prisma.transaction.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      customerId,
      customerName: customer.name,
      balanceCents: account.balanceCents,
      balanceFormatted: this.formatCurrency(account.balanceCents),
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amountCents: t.amountCents,
        amountFormatted: this.formatCurrency(t.amountCents),
        description: t.description,
        createdAt: t.createdAt,
      })),
    };
  }

  /**
   * Get aggregated Dashboard Stats
   */
  async getDashboardStats(clinicId: string, month: number, year: number) {
    console.log(
      `[FinanceService] getDashboardStats called for clinic=${clinicId}, month=${month}, year=${year}`,
    );
    try {
      const now = new Date();
      const targetDate = new Date(year, month - 1, 1); // Month is 1-based in API
      const startDate = startOfMonth(targetDate);
      const endDate = endOfMonth(targetDate);

      const prevDate = subMonths(targetDate, 1);
      const prevStartDate = startOfMonth(prevDate);
      const prevEndDate = endOfMonth(prevDate);

      console.log(
        `[FinanceService] Date ranges: Current=[${startDate.toISOString()} - ${endDate.toISOString()}], Prev=[${prevStartDate.toISOString()} - ${prevEndDate.toISOString()}]`,
      );

      // Run queries in parallel
      const [
        currentRevenue,
        currentExpenses,
        currentOrdersCount,
        currentQuotesCount,
        prevRevenue,
        prevExpenses,
        prevOrdersCount,
        prevQuotesCount,
        monthlyTrend,
        topProducts,
        recentOrders,
        currentBilled,
        prevBilled,
      ] = await Promise.all([
        // 1. Current Month Revenue = pagamentos EFETIVAMENTE RECEBIDOS no período
        //    (consistente com GET /finance/reports/revenue). Não conta pedido não pago.
        this.prisma.transaction
          .aggregate({
            _sum: { amountCents: true },
            where: {
              clinicId,
              type: TransactionType.PAYMENT,
              createdAt: { gte: startDate, lte: endDate },
            },
          })
          .catch((e) => {
            console.error('Error fetching currentRevenue', e);
            throw e;
          }),
        // 2. Current Month Expenses
        this.prisma.expense
          .aggregate({
            _sum: { amountCents: true },
            where: {
              clinicId,
              paidAt: { gte: startDate, lte: endDate },
              status: ExpenseStatus.PAID,
            },
          })
          .catch((e) => {
            console.error('Error fetching currentExpenses', e);
            throw e;
          }),
        // 3. Current Orders Count
        this.prisma.order
          .count({
            where: {
              clinicId,
              createdAt: { gte: startDate, lte: endDate },
              status: { notIn: [OrderStatus.RASCUNHO, OrderStatus.CANCELADO] },
            },
          })
          .catch((e) => {
            console.error('Error fetching currentOrdersCount', e);
            throw e;
          }),
        // 4. Current Quotes Count
        this.prisma.quote
          .count({
            where: {
              clinicId,
              createdAt: { gte: startDate, lte: endDate },
            },
          })
          .catch((e) => {
            console.error('Error fetching currentQuotesCount', e);
            throw e;
          }),
        // 5. Previous Month Revenue = pagamentos recebidos no mês anterior
        this.prisma.transaction
          .aggregate({
            _sum: { amountCents: true },
            where: {
              clinicId,
              type: TransactionType.PAYMENT,
              createdAt: { gte: prevStartDate, lte: prevEndDate },
            },
          })
          .catch((e) => {
            console.error('Error fetching prevRevenue', e);
            throw e;
          }),
        // 6. Previous Month Expenses
        this.prisma.expense
          .aggregate({
            _sum: { amountCents: true },
            where: {
              clinicId,
              paidAt: { gte: prevStartDate, lte: prevEndDate },
              status: ExpenseStatus.PAID,
            },
          })
          .catch((e) => {
            console.error('Error fetching prevExpenses', e);
            throw e;
          }),
        // 7. Previous Orders Count
        this.prisma.order
          .count({
            where: {
              clinicId,
              createdAt: { gte: prevStartDate, lte: prevEndDate },
              status: { notIn: [OrderStatus.RASCUNHO, OrderStatus.CANCELADO] },
            },
          })
          .catch((e) => {
            console.error('Error fetching prevOrdersCount', e);
            throw e;
          }),
        // 8. Previous Quotes Count
        this.prisma.quote
          .count({
            where: {
              clinicId,
              createdAt: { gte: prevStartDate, lte: prevEndDate },
            },
          })
          .catch((e) => {
            console.error('Error fetching prevQuotesCount', e);
            throw e;
          }),
        // 9. Monthly Trend (Last 6 Months)
        this.getMonthlyTrend(clinicId, 6).catch((e) => {
          console.error('Error fetching monthlyTrend', e);
          throw e;
        }),
        // 10. Top Products (Revenue)
        this.prisma.orderItem
          .groupBy({
            by: ['productId'],
            _sum: { totalCents: true, quantityBoxes: true },
            where: {
              order: {
                clinicId,
                createdAt: { gte: subMonths(new Date(), 3) }, // Last 3 months for relevance
                status: {
                  notIn: [OrderStatus.RASCUNHO, OrderStatus.CANCELADO],
                },
              },
            },
            orderBy: { _sum: { totalCents: 'desc' } },
            take: 5,
          })
          .catch((e) => {
            console.error('Error fetching topProducts', e);
            throw e;
          }),
        // 11. Recent Orders
        this.prisma.order
          .findMany({
            where: { clinicId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { customer: { select: { name: true } } },
          })
          .catch((e) => {
            console.error('Error fetching recentOrders', e);
            throw e;
          }),
        // 12. Pedidos faturados no período (total dos pedidos, pagos ou não) — métrica auxiliar
        this.prisma.order
          .aggregate({
            _sum: { totalCents: true },
            where: {
              clinicId,
              createdAt: { gte: startDate, lte: endDate },
              status: { notIn: [OrderStatus.RASCUNHO, OrderStatus.CANCELADO] },
            },
          })
          .catch((e) => {
            console.error('Error fetching currentBilled', e);
            throw e;
          }),
        // 13. Pedidos faturados no mês anterior
        this.prisma.order
          .aggregate({
            _sum: { totalCents: true },
            where: {
              clinicId,
              createdAt: { gte: prevStartDate, lte: prevEndDate },
              status: { notIn: [OrderStatus.RASCUNHO, OrderStatus.CANCELADO] },
            },
          })
          .catch((e) => {
            console.error('Error fetching prevBilled', e);
            throw e;
          }),
      ]);

      console.log('[FinanceService] All queries completed successfully');

      // Process Top Products Names
      console.log('[FinanceService] Processing top products names...');
      const topProductsWithNames = await Promise.all(
        topProducts.map(async (item) => {
          const product = await this.prisma.product.findUnique({
            where: { id: item.productId },
            select: { name: true },
          });
          return {
            name: product?.name || 'Produto Desconhecido',
            sold: item._sum.quantityBoxes || 0,
            revenue: item._sum.totalCents || 0,
          };
        }),
      );

      // Calculate Metrics
      const revenue = currentRevenue._sum?.amountCents || 0; // dinheiro recebido
      const billedCents = currentBilled._sum?.totalCents || 0; // pedidos faturados
      const expenses = currentExpenses._sum?.amountCents || 0;
      const profit = revenue - expenses;
      const averageTicket =
        currentOrdersCount > 0 ? Math.round(billedCents / currentOrdersCount) : 0;
      const conversionRate =
        currentQuotesCount > 0
          ? ((currentOrdersCount / currentQuotesCount) * 100).toFixed(1)
          : 0;

      const prevRevenueCents = prevRevenue._sum?.amountCents || 0;
      const prevProfit = prevRevenueCents - (prevExpenses._sum?.amountCents || 0);

      console.log(
        `[FinanceService] Returning stats: Revenue=${revenue}, Profit=${profit}`,
      );

      return {
        currentMonth: {
          revenue,
          billedCents,
          expenses,
          profit,
          ordersCount: currentOrdersCount,
          averageTicket,
          quotesCount: currentQuotesCount,
          conversionRate: Number(conversionRate),
        },
        previousMonth: {
          revenue: prevRevenueCents,
          billedCents: prevBilled._sum?.totalCents || 0,
          expenses: prevExpenses._sum?.amountCents || 0,
          profit: prevProfit,
          ordersCount: prevOrdersCount,
        },
        monthlyTrend,
        topProducts: topProductsWithNames,
        recentOrders: recentOrders.map((o) => ({
          id: o.id,
          customer: o.customer.name,
          date: o.createdAt,
          total: o.totalCents,
          status:
            o.fulfillmentStatus ||
            (o.status === OrderStatus.ENTREGUE
              ? 'DELIVERED'
              : o.status === OrderStatus.EM_SEPARACAO
                ? 'IN_SEPARATION'
                : 'PENDING'), // Map to frontend expected statuses
        })),
      };
    } catch (error) {
      console.error(
        '[FinanceService] Critical Error in getDashboardStats:',
        error,
      );
      throw error;
    }
  }

  private async getMonthlyTrend(clinicId: string, months: number) {
    const result = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const monthLabel = format(date, 'MMM', {}); // English shorthand for now, can use locale

      const revenue = await this.prisma.order.aggregate({
        _sum: { totalCents: true },
        where: {
          clinicId,
          createdAt: { gte: start, lte: end },
          status: { notIn: [OrderStatus.RASCUNHO, OrderStatus.CANCELADO] },
        },
      });

      result.push({
        month: monthLabel,
        revenue: revenue._sum?.totalCents || 0,
      });
    }
    return result;
  }

  /**
   * Create a charge transaction (débito)
   */
  async createCharge(
    clinicId: string,
    patientId: string,
    amountCents: number,
    description: string,
    encounterId?: string,
    userId?: string,
  ) {
    if (amountCents <= 0) {
      throw new BadRequestException('Valor deve ser positivo');
    }

    const account = await this.getOrCreateAccount(clinicId, patientId);

    // Create transaction
    const transaction = await this.prisma.transaction.create({
      data: {
        clinicId,
        patientId,
        accountId: account.id,
        encounterId,
        type: TransactionType.CHARGE,
        amountCents,
        description,
      },
    });

    // Update account balance (charge = negative)
    await this.prisma.patientAccount.update({
      where: { id: account.id },
      data: { balanceCents: account.balanceCents - amountCents },
    });

    await this.auditService.log({
      clinicId,
      userId,
      action: AuditAction.CREATE,
      entity: 'Transaction',
      entityId: transaction.id,
      message: `Cobrança: ${this.formatCurrency(amountCents)}`,
    });

    return transaction;
  }

  /**
   * Create a payment transaction (crédito)
   */
  async createPayment(
    clinicId: string,
    patientId: string,
    amountCents: number,
    description: string,
    userId?: string,
  ) {
    if (amountCents <= 0) {
      throw new BadRequestException('Valor deve ser positivo');
    }

    const account = await this.getOrCreateAccount(clinicId, patientId);

    // Create transaction
    const transaction = await this.prisma.transaction.create({
      data: {
        clinicId,
        patientId,
        accountId: account.id,
        type: TransactionType.PAYMENT,
        amountCents,
        description,
      },
    });

    // Update account balance (payment = positive)
    await this.prisma.patientAccount.update({
      where: { id: account.id },
      data: { balanceCents: account.balanceCents + amountCents },
    });

    await this.auditService.log({
      clinicId,
      userId,
      action: AuditAction.CREATE,
      entity: 'Transaction',
      entityId: transaction.id,
      message: `Pagamento: ${this.formatCurrency(amountCents)}`,
    });

    return transaction;
  }

  /**
   * Calculate encounter total (procedures + consumables)
   */
  async calculateEncounterTotal(encounterId: string) {
    const encounter = await this.prisma.encounter.findUnique({
      where: { id: encounterId },
      include: {
        procedures: true,
        consumables: {
          include: {
            // Note: consumables don't have product relation in current schema
            // This will need to be updated when we link them
          },
        },
      },
    });

    if (!encounter) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    // Sum procedure prices
    const proceduresTotal = encounter.procedures.reduce(
      (sum, p) => sum + (p.priceCents || 0),
      0,
    );

    // For now, consumables don't have price - will be added in future
    const consumablesTotal = 0;

    return {
      encounterId,
      proceduresTotal,
      consumablesTotal,
      totalCents: proceduresTotal + consumablesTotal,
      totalFormatted: this.formatCurrency(proceduresTotal + consumablesTotal),
    };
  }

  /**
   * Charge encounter to patient account
   */
  async chargeEncounter(
    clinicId: string,
    encounterId: string,
    userId?: string,
  ) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, clinicId },
    });

    if (!encounter) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    const total = await this.calculateEncounterTotal(encounterId);

    if (total.totalCents <= 0) {
      return { message: 'Nenhum valor a cobrar', totalCents: 0 };
    }

    const transaction = await this.createCharge(
      clinicId,
      encounter.patientId,
      total.totalCents,
      `Atendimento ${encounter.date}`,
      encounterId,
      userId,
    );

    return {
      message: 'Cobrança realizada',
      totalCents: total.totalCents,
      transactionId: transaction.id,
    };
  }

  /**
   * Lança na conta-corrente do cliente a COBRANÇA (débito) referente a um pedido
   * de venda. Sem isso, o `registerPayment` só creditava a conta e o saldo do
   * cliente ficava positivo (crédito fantasma) mesmo com o pedido quitado (bug A7).
   * Idempotente: não duplica a cobrança do mesmo pedido.
   */
  async chargeOrder(
    clinicId: string,
    orderId: string,
    userId?: string,
    tx?: PrismaLike,
  ) {
    const db = tx ?? this.prisma;
    const order = await db.order.findFirst({
      where: { id: orderId, clinicId },
      select: { id: true, number: true, customerId: true, totalCents: true },
    });
    if (!order) return null;
    if (!order.customerId || order.totalCents <= 0) return null; // balcão sem cliente

    const account = await this.getOrCreateAccount(
      clinicId,
      null,
      order.customerId,
      db,
    );

    const description = `Cobrança Pedido #${order.number}`;
    const existing = await db.transaction.findFirst({
      where: {
        accountId: account.id,
        type: TransactionType.CHARGE,
        description,
      },
    });
    if (existing) return existing;

    const transaction = await db.transaction.create({
      data: {
        clinicId,
        customerId: order.customerId,
        accountId: account.id,
        type: TransactionType.CHARGE,
        amountCents: order.totalCents,
        description,
      },
    });

    await db.patientAccount.update({
      where: { id: account.id },
      data: { balanceCents: { decrement: order.totalCents } },
    });

    await this.auditService.log({
      clinicId,
      userId,
      action: AuditAction.CREATE,
      entity: 'Transaction',
      entityId: transaction.id,
      message: `${description}: ${this.formatCurrency(order.totalCents)}`,
    });

    return transaction;
  }

  /**
   * Reverte na conta-corrente as movimentações de um pedido CANCELADO:
   * estorna a cobrança e, se houve pagamento, marca os `Payment` como REFUNDED
   * e lança o estorno (débito) — deixando o saldo do cliente de volta a zero.
   * No-op se o pedido nunca gerou cobrança (cancelado antes de pagar).
   */
  async refundOrder(
    clinicId: string,
    orderId: string,
    userId?: string,
    tx?: PrismaLike,
  ) {
    const db = tx ?? this.prisma;
    const order = await db.order.findFirst({
      where: { id: orderId, clinicId },
      select: { id: true, number: true, customerId: true },
    });
    if (!order?.customerId) return null;

    const account = await this.getOrCreateAccount(
      clinicId,
      null,
      order.customerId,
      db,
    );

    const chargeTx = await db.transaction.findFirst({
      where: {
        accountId: account.id,
        type: TransactionType.CHARGE,
        description: `Cobrança Pedido #${order.number}`,
      },
    });
    if (!chargeTx) return null; // nunca cobrado

    const reversalDesc = `Estorno da cobrança - Pedido #${order.number} cancelado`;
    const already = await db.transaction.findFirst({
      where: {
        accountId: account.id,
        type: TransactionType.ADJUSTMENT,
        description: reversalDesc,
      },
    });
    if (already) return already;

    // 1. Reverte a cobrança (crédito de volta)
    await db.transaction.create({
      data: {
        clinicId,
        customerId: order.customerId,
        accountId: account.id,
        type: TransactionType.ADJUSTMENT,
        amountCents: chargeTx.amountCents,
        description: reversalDesc,
      },
    });
    await db.patientAccount.update({
      where: { id: account.id },
      data: { balanceCents: { increment: chargeTx.amountCents } },
    });

    // 2. Estorna pagamentos aprovados, se houver
    const paidAgg = await db.payment.aggregate({
      where: { orderId, status: 'APPROVED' },
      _sum: { amountCents: true },
    });
    const paid = paidAgg._sum.amountCents || 0;
    if (paid > 0) {
      await db.payment.updateMany({
        where: { orderId, status: 'APPROVED' },
        data: { status: 'REFUNDED' },
      });
      await db.transaction.create({
        data: {
          clinicId,
          customerId: order.customerId,
          accountId: account.id,
          type: TransactionType.REFUND,
          amountCents: paid,
          description: `Estorno Pedido #${order.number}`,
        },
      });
      await db.patientAccount.update({
        where: { id: account.id },
        data: { balanceCents: { decrement: paid } },
      });
    }

    await this.auditService.log({
      clinicId,
      userId,
      action: AuditAction.UPDATE,
      entity: 'Order',
      entityId: order.id,
      message: `Estorno financeiro do Pedido #${order.number} (cobrança ${this.formatCurrency(chargeTx.amountCents)}, pago ${this.formatCurrency(paid)})`,
    });

    return { reversed: true, chargeCents: chargeTx.amountCents, refundedCents: paid };
  }

  /**
   * Estorno parcial referente a uma ocorrência de avaria/RMA marcada como REEMBOLSADO.
   * Valoriza os itens pelo preço do item do pedido vinculado (fallback: preço do produto)
   * e lança um crédito (REFUND) na conta-corrente do cliente. Idempotente por ocorrência.
   */
  async refundOccurrence(
    clinicId: string,
    occurrence: {
      id: string;
      number: number;
      customerId?: string | null;
      orderId?: string | null;
      items: Array<{ productId: string; quantity: number; unitType?: string }>;
    },
    userId?: string,
  ) {
    if (!occurrence.customerId) return null;

    const account = await this.getOrCreateAccount(
      clinicId,
      null,
      occurrence.customerId,
    );

    const description = `Estorno RMA-${occurrence.number}`;
    const already = await this.prisma.transaction.findFirst({
      where: {
        accountId: account.id,
        type: TransactionType.REFUND,
        description,
      },
    });
    if (already) return already;

    // Valorização dos itens
    let orderItems: Array<{ productId: string; unitPriceCents: number }> = [];
    if (occurrence.orderId) {
      orderItems = await this.prisma.orderItem.findMany({
        where: { orderId: occurrence.orderId },
        select: { productId: true, unitPriceCents: true },
      });
    }

    let refundCents = 0;
    for (const item of occurrence.items) {
      const oi = orderItems.find((o) => o.productId === item.productId);
      let unit = oi?.unitPriceCents;
      if (unit == null) {
        const p = await this.prisma.product.findUnique({
          where: { id: item.productId },
          select: { priceCents: true },
        });
        unit = p?.priceCents || 0;
      }
      refundCents += Math.round(unit * item.quantity);
    }

    if (refundCents <= 0) return null;

    const transaction = await this.prisma.transaction.create({
      data: {
        clinicId,
        customerId: occurrence.customerId,
        accountId: account.id,
        type: TransactionType.REFUND,
        amountCents: refundCents,
        description,
      },
    });

    await this.prisma.patientAccount.update({
      where: { id: account.id },
      data: { balanceCents: { increment: refundCents } },
    });

    await this.auditService.log({
      clinicId,
      userId,
      action: AuditAction.CREATE,
      entity: 'Transaction',
      entityId: transaction.id,
      message: `${description}: ${this.formatCurrency(refundCents)}`,
    });

    return transaction;
  }

  /**
   * Register a payment with method and create transaction
   */
  async registerPayment(
    clinicId: string,
    patientId: string | null | undefined,
    amountCents: number,
    method: string,
    description?: string,
    installments = 1,
    userId?: string,
    customerId?: string,
    orderId?: string,
    tx?: PrismaLike,
  ) {
    if (amountCents <= 0) {
      throw new BadRequestException('Valor deve ser positivo');
    }
    if (!Object.values(PaymentMethod).includes(method as PaymentMethod)) {
      throw new BadRequestException(`Método de pagamento inválido: ${method}`);
    }

    const db = tx ?? this.prisma;
    const account = await this.getOrCreateAccount(
      clinicId,
      patientId,
      customerId,
      db,
    );

    // Create payment record
    const payment = await db.payment.create({
      data: {
        clinicId,
        patientId: patientId || undefined,
        customerId: customerId || undefined,
        orderId: orderId || undefined,
        amountCents,
        method: method as any,
        status: 'APPROVED',
        installments,
        paidAt: new Date(),
      },
    });

    // Create transaction linked to payment
    const transaction = await db.transaction.create({
      data: {
        clinicId,
        patientId: patientId || undefined,
        customerId: customerId || undefined,
        accountId: account.id,
        paymentId: payment.id,
        type: TransactionType.PAYMENT,
        amountCents,
        description: description || `Pagamento ${method}`,
      },
    });

    // Update account balance (incremento atômico — evita corrida entre pagamentos)
    await db.patientAccount.update({
      where: { id: account.id },
      data: { balanceCents: { increment: amountCents } },
    });

    await this.auditService.log({
      clinicId,
      userId,
      action: AuditAction.CREATE,
      entity: 'Payment',
      entityId: payment.id,
      message: `Pagamento: ${this.formatCurrency(amountCents)} via ${method}`,
    });

    return {
      payment,
      transaction,
      newBalance: account.balanceCents + amountCents,
    };
  }

  /**
   * List payments for a patient
   */
  async listPayments(clinicId: string, patientId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { clinicId, patientId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return payments.map((p) => ({
      id: p.id,
      amountCents: p.amountCents,
      amountFormatted: this.formatCurrency(p.amountCents),
      method: p.method,
      status: p.status,
      installments: p.installments,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    }));
  }

  private formatCurrency(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  }

  // =====================================================
  // BOLETOS / INVOICES (ERP Revestimentos)
  // =====================================================

  async generateInvoice(clinicId: string, orderId: string, dueDate: string) {
    // 1. Verify Order
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, clinicId },
      include: { customer: true },
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    if (order.status === OrderStatus.CANCELADO) {
      throw new BadRequestException(
        'Não é possível gerar boleto para um pedido cancelado.',
      );
    }

    // Pedido que já foi pago (ou já avançou no fluxo pós-pagamento) não recebe boleto
    const paidStatuses: OrderStatus[] = [
      OrderStatus.PAGO,
      OrderStatus.AGUARDANDO_COMPRA,
      OrderStatus.AGUARDANDO_CHEGADA,
      OrderStatus.AGUARDANDO_REPOSICAO,
      OrderStatus.MATERIAL_RECEBIDO,
      OrderStatus.AGUARDANDO_MATERIAL,
      OrderStatus.EM_SEPARACAO,
      OrderStatus.PRONTO_PARA_RETIRA,
      OrderStatus.PRONTO_PARA_ENTREGA,
      OrderStatus.SAIU_PARA_ENTREGA,
      OrderStatus.ENTREGUE,
    ];
    const approvedPayments = await this.prisma.payment.count({
      where: { orderId, status: 'APPROVED' },
    });
    if (paidStatuses.includes(order.status) || approvedPayments > 0) {
      throw new BadRequestException(
        'Não é possível gerar boleto para um pedido que já foi pago.',
      );
    }

    // Impede boleto duplicado em aberto para o mesmo pedido
    const openInvoice = await this.prisma.invoice.findFirst({
      where: { clinicId, orderId, status: 'PENDING' },
    });
    if (openInvoice) {
      throw new BadRequestException(
        'Já existe um boleto em aberto para este pedido.',
      );
    }

    // 2. Generate Mock Data (Barcode, PDF Link)
    const mockBarcode = `34191.79001 01043.510047 91020.150008 5 ${Math.floor(Date.now() / 1000)}0`;
    const mockPdfUrl = `https://mock-bank.com/boleto/${order.id}.pdf`;

    // 3. Create Invoice
    const invoice = await this.prisma.invoice.create({
      data: {
        clinicId,
        orderId,
        amountCents: order.totalCents,
        dueDate: new Date(dueDate),
        status: 'PENDING',
        barCode: mockBarcode,
        pdfUrl: mockPdfUrl,
        provider: 'INTERNAL_MOCK',
      },
    });

    return invoice;
  }

  async listInvoices(clinicId: string, orderId: string) {
    return this.prisma.invoice.findMany({
      where: { clinicId, orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateInvoiceStatus(
    clinicId: string,
    invoiceId: string,
    status: 'PAID' | 'CANCELLED',
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, clinicId },
    });

    if (!invoice) throw new NotFoundException('Boleto não encontrado');

    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status,
        paidAt: status === 'PAID' ? new Date() : null,
      },
    });

    return updated;
  }

  // =====================================================
  // FINANCIAL REPORTS
  // =====================================================

  async getRevenueReport(
    clinicId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Get all transactions of type PAYMENT
    const payments = await this.prisma.transaction.findMany({
      where: {
        clinicId,
        type: TransactionType.PAYMENT,
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      },
      include: {
        payment: true, // includes the method (PIX, CREDIT_CARD, etc)
        patient: { select: { name: true, document: true } },
        customer: { select: { name: true, document: true } }, // L9: pagamentos de pedido usam customer, não patient
        encounter: { select: { date: true, id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Aggregate by payment method
    const methodTotals: Record<string, number> = {};
    let totalRevenue = 0;

    payments.forEach((t) => {
      const method = t.payment?.method || 'OUTROS';
      if (!methodTotals[method]) methodTotals[method] = 0;
      methodTotals[method] += t.amountCents;
      totalRevenue += t.amountCents;
    });

    return {
      summary: {
        totalCents: totalRevenue,
        byMethod: Object.entries(methodTotals).map(([method, total]) => ({
          method,
          totalCents: total,
        })),
        count: payments.length,
      },
      transactions: payments.map((t) => ({
        id: t.id,
        date: t.createdAt,
        amountCents: t.amountCents,
        description: t.description,
        method: t.payment?.method || 'OUTROS',
        patientName: t.customer?.name || t.patient?.name || 'Não identificado',
        encounterId: t.encounterId,
        encounterDate: t.encounter?.date,
      })),
    };
  }

  async getInventoryValuation(clinicId: string) {
    // Get all active products with their active lots where quantity > 0
    const productsInStock = await this.prisma.product.findMany({
      where: {
        clinicId,
        isActive: true, // Only consider active products
        lots: {
          some: {
            quantity: { gt: 0 },
          },
        },
      },
      include: {
        lots: {
          where: {
            quantity: { gt: 0 },
          },
        },
      },
    });

    let totalCostCents = 0;
    let totalSalesCents = 0;
    let totalItems = 0;

    for (const product of productsInStock) {
      const cost = product.costCents || 0;
      const price = product.priceCents || 0;

      const productTotalQuantity = product.lots.reduce(
        (acc, lot) => acc + lot.quantity,
        0,
      );

      totalCostCents += productTotalQuantity * cost;
      totalSalesCents += productTotalQuantity * price;
      totalItems += productTotalQuantity;
    }

    return {
      totalCostCents,
      totalCostFormatted: this.formatCurrency(totalCostCents),
      totalSalesCents,
      totalSalesFormatted: this.formatCurrency(totalSalesCents),
      projectedProfitCents: totalSalesCents - totalCostCents,
      projectedProfitFormatted: this.formatCurrency(
        totalSalesCents - totalCostCents,
      ),
      totalItems,
    };
  }

  // =====================================================
  // SERVICE INVOICES (NFS-E)
  // =====================================================

  async listServiceInvoices(
    clinicId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    return this.prisma.expense.findMany({
      where: {
        clinicId,
        isServiceInvoice: true,
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createServiceInvoice(clinicId: string, data: any) {
    return this.prisma.expense.create({
      data: {
        clinicId,
        description: data.description || 'Nota de Serviço',
        amountCents: data.amountCents,
        dueDate: data.dueDate ? new Date(data.dueDate) : new Date(),
        status: data.status || ExpenseStatus.PENDING,
        type: ExpenseType.OPERATIONAL,
        isServiceInvoice: true,
        invoiceNumber: data.invoiceNumber,
        providerDocument: data.providerDocument,
        providerName: data.providerName,
        issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
        documentUrl: data.documentUrl,
      },
    });
  }
}
