import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

// Widget types available for flooring store
export const WIDGET_TYPES = [
    'birthdays',
    'stock_alerts',
    'expenses_due',
    'pending_orders',
    'today_revenue',
    'pending_deliveries',
] as const;

export type WidgetType = (typeof WIDGET_TYPES)[number];

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) { }

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
                bd.getMonth() === today.getMonth() &&
                bd.getDate() === today.getDate()
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
                status: { in: ['PENDING', 'CONFIRMED', 'IN_SEPARATION', 'READY'] },
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

        const orders = await this.prisma.order.findMany({
            where: {
                clinicId,
                createdAt: { gte: today, lt: tomorrow },
                status: { not: 'CANCELLED' },
            },
            select: { totalCents: true },
        });

        const totalCents = orders.reduce((sum, o) => sum + o.totalCents, 0);
        return { totalCents, count: orders.length };
    }

    // Get pending deliveries
    async getPendingDeliveries(clinicId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return this.prisma.order.findMany({
            where: {
                clinicId,
                status: { in: ['CONFIRMED', 'IN_SEPARATION', 'READY'] },
                deliveryDate: { gte: today },
            },
            include: {
                customer: { select: { name: true } },
            },
            orderBy: { deliveryDate: 'asc' },
            take: 5,
        });
    }

    // ====================================================================
    // FINANCIAL REPORTS (PHASE 4)
    // ====================================================================

    // Seller Performance Report
    async getSellersPerformance(clinicId: string, startDate?: string, endDate?: string) {
        const dateFilter: any = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);

        // 1. Get all sellers (Users with SELLER role or involved in orders)
        const sellers = await this.prisma.user.findMany({
            where: {
                clinicUsers: {
                    some: {
                        clinicId,
                        role: { key: 'SELLER' }
                    }
                }
            },
            select: { id: true, name: true, email: true }
        });

        const report = [];

        for (const seller of sellers) {
            // Aggregate Orders
            const orders = await this.prisma.order.findMany({
                where: {
                    clinicId,
                    sellerId: seller.id,
                    createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
                    status: { not: 'CANCELLED' }
                },
                select: { totalCents: true }
            });

            // Aggregate Quotes
            const quotesCount = await this.prisma.quote.count({
                where: {
                    clinicId,
                    sellerId: seller.id,
                    createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
                }
            });

            const ordersCount = orders.length;
            const totalRevenue = orders.reduce((sum, o) => sum + o.totalCents, 0);
            const conversionRate = quotesCount > 0 ? (ordersCount / quotesCount) * 100 : 0;
            const averageTicket = ordersCount > 0 ? Math.round(totalRevenue / ordersCount) : 0;

            // Commission logic (mock logic: 3% flat)
            // In a real scenario, this would come from a user setting or commission rules
            const commission = Math.round(totalRevenue * 0.03);

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
                    commission
                },
                rank: 0, // Calculated after sorting
                trend: 0 // Requires previous period logic (omitted for MVP)
            });
        }

        // Rank by Revenue
        report.sort((a, b) => b.stats.totalRevenue - a.stats.totalRevenue);
        report.forEach((r, i) => r.rank = i + 1);

        // Calculate Totals
        const totals = report.reduce((acc, curr) => ({
            totalRevenue: acc.totalRevenue + curr.stats.totalRevenue,
            totalOrders: acc.totalOrders + curr.stats.ordersCount,
            totalQuotes: acc.totalQuotes + curr.stats.quotesCount,
            totalCommission: acc.totalCommission + curr.stats.commission
        }), { totalRevenue: 0, totalOrders: 0, totalQuotes: 0, totalCommission: 0 });

        const avgConversion = totals.totalQuotes > 0 ? (totals.totalOrders / totals.totalQuotes) * 100 : 0;

        return { sellers: report, totals: { ...totals, avgConversion: Number(avgConversion.toFixed(1)) } };
    }

    // Architect Commission Report
    async getArchitectsPerformance(clinicId: string, startDate?: string, endDate?: string) {
        const dateFilter: any = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);

        // Get architects with sales
        const architects = await this.prisma.architect.findMany({
            where: { clinicId, isActive: true },
            include: {
                customers: {
                    include: {
                        orders: {
                            where: {
                                clinicId,
                                createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
                                status: { not: 'CANCELLED' }
                            },
                            select: { totalCents: true }
                        }
                    }
                }
            }
        });

        const report = architects.map(arch => {
            // Flatten orders from all customers of this architect
            const allOrders = arch.customers.flatMap(c => c.orders);
            const totalSales = allOrders.reduce((sum, o) => sum + o.totalCents, 0);
            const clientsCount = arch.customers.filter(c => c.orders.length > 0).length;
            const commissionTotal = Math.round(totalSales * ((arch.commissionRate || 0) / 100));

            return {
                id: arch.id,
                name: arch.name,
                commissionRate: arch.commissionRate,
                stats: {
                    totalSales,
                    clientsCount,
                    commissionTotal
                }
            };
        });

        // Filter out architects with no sales? Or keep them showing 0? Keeping for visibility.
        return report.sort((a, b) => b.stats.totalSales - a.stats.totalSales);
    }
}
