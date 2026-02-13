import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { AuditAction, TransactionType, OrderStatus, QuoteStatus, ExpenseStatus } from '@prisma/client';
import { startOfMonth, endOfMonth, subMonths, format, subDays } from 'date-fns';

@Injectable()
export class FinanceService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
    ) { }

    /**
     * Get or create patient/customer account
     */
    async getOrCreateAccount(clinicId: string, patientId?: string | null, customerId?: string | null) {
        if (!patientId && !customerId) {
            throw new BadRequestException('ID do Paciente ou Cliente é obrigatório');
        }

        let account;

        if (patientId) {
            account = await this.prisma.patientAccount.findUnique({
                where: { patientId },
            });
        } else if (customerId) {
            account = await this.prisma.patientAccount.findUnique({
                where: { customerId },
            });
        }

        if (!account) {
            account = await this.prisma.patientAccount.create({
                data: {
                    clinicId,
                    patientId: patientId || undefined,
                    customerId: customerId || undefined
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
            transactions: transactions.map(t => ({
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
     * Get aggregated Dashboard Stats
     */
    async getDashboardStats(clinicId: string, month: number, year: number) {
        console.log(`[FinanceService] getDashboardStats called for clinic=${clinicId}, month=${month}, year=${year}`);
        try {
            const now = new Date();
            const targetDate = new Date(year, month - 1, 1); // Month is 1-based in API
            const startDate = startOfMonth(targetDate);
            const endDate = endOfMonth(targetDate);

            const prevDate = subMonths(targetDate, 1);
            const prevStartDate = startOfMonth(prevDate);
            const prevEndDate = endOfMonth(prevDate);

            console.log(`[FinanceService] Date ranges: Current=[${startDate.toISOString()} - ${endDate.toISOString()}], Prev=[${prevStartDate.toISOString()} - ${prevEndDate.toISOString()}]`);

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
                recentOrders
            ] = await Promise.all([
                // 1. Current Month Revenue (Orders created/confirmed in period, not cancelled/draft)
                this.prisma.order.aggregate({
                    _sum: { totalCents: true },
                    where: {
                        clinicId,
                        createdAt: { gte: startDate, lte: endDate },
                        status: { notIn: [OrderStatus.RASCUNHO, OrderStatus.CANCELADO] }
                    }
                }).catch(e => { console.error('Error fetching currentRevenue', e); throw e; }),
                // 2. Current Month Expenses
                this.prisma.expense.aggregate({
                    _sum: { amountCents: true },
                    where: {
                        clinicId,
                        dueDate: { gte: startDate, lte: endDate },
                        status: { not: ExpenseStatus.CANCELLED }
                    }
                }).catch(e => { console.error('Error fetching currentExpenses', e); throw e; }),
                // 3. Current Orders Count
                this.prisma.order.count({
                    where: {
                        clinicId,
                        createdAt: { gte: startDate, lte: endDate },
                        status: { notIn: [OrderStatus.RASCUNHO, OrderStatus.CANCELADO] }
                    }
                }).catch(e => { console.error('Error fetching currentOrdersCount', e); throw e; }),
                // 4. Current Quotes Count
                this.prisma.quote.count({
                    where: {
                        clinicId,
                        createdAt: { gte: startDate, lte: endDate }
                    }
                }).catch(e => { console.error('Error fetching currentQuotesCount', e); throw e; }),
                // 5. Previous Month Revenue
                this.prisma.order.aggregate({
                    _sum: { totalCents: true },
                    where: {
                        clinicId,
                        createdAt: { gte: prevStartDate, lte: prevEndDate },
                        status: { notIn: [OrderStatus.RASCUNHO, OrderStatus.CANCELADO] }
                    }
                }).catch(e => { console.error('Error fetching prevRevenue', e); throw e; }),
                // 6. Previous Month Expenses
                this.prisma.expense.aggregate({
                    _sum: { amountCents: true },
                    where: {
                        clinicId,
                        dueDate: { gte: prevStartDate, lte: prevEndDate },
                        status: { not: ExpenseStatus.CANCELLED }
                    }
                }).catch(e => { console.error('Error fetching prevExpenses', e); throw e; }),
                // 7. Previous Orders Count
                this.prisma.order.count({
                    where: {
                        clinicId,
                        createdAt: { gte: prevStartDate, lte: prevEndDate },
                        status: { notIn: [OrderStatus.RASCUNHO, OrderStatus.CANCELADO] }
                    }
                }).catch(e => { console.error('Error fetching prevOrdersCount', e); throw e; }),
                // 8. Previous Quotes Count
                this.prisma.quote.count({
                    where: {
                        clinicId,
                        createdAt: { gte: prevStartDate, lte: prevEndDate }
                    }
                }).catch(e => { console.error('Error fetching prevQuotesCount', e); throw e; }),
                // 9. Monthly Trend (Last 6 Months)
                this.getMonthlyTrend(clinicId, 6).catch(e => { console.error('Error fetching monthlyTrend', e); throw e; }),
                // 10. Top Products (Revenue)
                this.prisma.orderItem.groupBy({
                    by: ['productId'],
                    _sum: { totalCents: true, quantityBoxes: true },
                    where: {
                        order: {
                            clinicId,
                            createdAt: { gte: subMonths(new Date(), 3) }, // Last 3 months for relevance
                            status: { notIn: [OrderStatus.RASCUNHO, OrderStatus.CANCELADO] }
                        }
                    },
                    orderBy: { _sum: { totalCents: 'desc' } },
                    take: 5
                }).catch(e => { console.error('Error fetching topProducts', e); throw e; }),
                // 11. Recent Orders
                this.prisma.order.findMany({
                    where: { clinicId },
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                    include: { customer: { select: { name: true } } }
                }).catch(e => { console.error('Error fetching recentOrders', e); throw e; })
            ]);

            console.log('[FinanceService] All queries completed successfully');

            // Process Top Products Names
            console.log('[FinanceService] Processing top products names...');
            const topProductsWithNames = await Promise.all(
                topProducts.map(async (item) => {
                    const product = await this.prisma.product.findUnique({
                        where: { id: item.productId },
                        select: { name: true }
                    });
                    return {
                        name: product?.name || 'Produto Desconhecido',
                        sold: item._sum.quantityBoxes || 0,
                        revenue: item._sum.totalCents || 0
                    };
                })
            );

            // Calculate Metrics
            const revenue = currentRevenue._sum?.totalCents || 0;
            const expenses = currentExpenses._sum?.amountCents || 0;
            const profit = revenue - expenses;
            const averageTicket = currentOrdersCount > 0 ? Math.round(revenue / currentOrdersCount) : 0;
            const conversionRate = currentQuotesCount > 0 ? ((currentOrdersCount / currentQuotesCount) * 100).toFixed(1) : 0;

            const prevProfit = (prevRevenue._sum?.totalCents || 0) - (prevExpenses._sum?.amountCents || 0);

            console.log(`[FinanceService] Returning stats: Revenue=${revenue}, Profit=${profit}`);

            return {
                currentMonth: {
                    revenue,
                    expenses,
                    profit,
                    ordersCount: currentOrdersCount,
                    averageTicket,
                    quotesCount: currentQuotesCount,
                    conversionRate: Number(conversionRate),
                },
                previousMonth: {
                    revenue: prevRevenue._sum?.totalCents || 0,
                    expenses: prevExpenses._sum?.amountCents || 0,
                    profit: prevProfit,
                    ordersCount: prevOrdersCount,
                },
                monthlyTrend,
                topProducts: topProductsWithNames,
                recentOrders: recentOrders.map(o => ({
                    id: o.id,
                    customer: o.customer.name,
                    date: o.createdAt,
                    total: o.totalCents,
                    status: o.fulfillmentStatus || (o.status === OrderStatus.ENTREGUE ? 'DELIVERED' : o.status === OrderStatus.EM_SEPARACAO ? 'IN_SEPARATION' : 'PENDING'), // Map to frontend expected statuses
                }))
            };
        } catch (error) {
            console.error('[FinanceService] Critical Error in getDashboardStats:', error);
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
                    status: { notIn: [OrderStatus.RASCUNHO, OrderStatus.CANCELADO] }
                }
            });

            result.push({
                month: monthLabel,
                revenue: revenue._sum?.totalCents || 0
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
            0
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
    async chargeEncounter(clinicId: string, encounterId: string, userId?: string) {
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
    ) {
        if (amountCents <= 0) {
            throw new BadRequestException('Valor deve ser positivo');
        }

        const account = await this.getOrCreateAccount(clinicId, patientId, customerId);

        // Create payment record
        const payment = await this.prisma.payment.create({
            data: {
                clinicId,
                patientId: patientId || undefined,
                customerId: customerId || undefined,
                amountCents,
                method: method as any,
                status: 'APPROVED',
                installments,
                paidAt: new Date(),
            },
        });

        // Create transaction linked to payment
        const transaction = await this.prisma.transaction.create({
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

        // Update account balance
        await this.prisma.patientAccount.update({
            where: { id: account.id },
            data: { balanceCents: account.balanceCents + amountCents },
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

        return payments.map(p => ({
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
            include: { customer: true }
        });

        if (!order) {
            throw new NotFoundException('Pedido não encontrado');
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
                provider: 'INTERNAL_MOCK'
            }
        });

        return invoice;
    }

    async listInvoices(clinicId: string, orderId: string) {
        return this.prisma.invoice.findMany({
            where: { clinicId, orderId },
            orderBy: { createdAt: 'desc' }
        });
    }

    async updateInvoiceStatus(clinicId: string, invoiceId: string, status: 'PAID' | 'CANCELLED') {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, clinicId }
        });

        if (!invoice) throw new NotFoundException('Boleto não encontrado');

        const updated = await this.prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                status,
                paidAt: status === 'PAID' ? new Date() : null
            }
        });

        return updated;
    }
}
