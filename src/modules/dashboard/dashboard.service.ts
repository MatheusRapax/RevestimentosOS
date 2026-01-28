import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

// Widget types available
export const WIDGET_TYPES = [
    'birthdays',
    'today_appointments',
    'stock_alerts',
    'notices',
    'open_encounters',
    'upcoming_expirations',
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
}
