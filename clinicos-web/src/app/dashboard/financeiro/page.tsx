'use client';

import React, { useState } from 'react';
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    ShoppingCart,
    Package,
    Users,
    FileText,
    Calendar,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    Loader2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MonthYearPicker } from './components/month-year-picker';



export default function FinanceiroPage() {
    const [currentDate, setCurrentDate] = useState(new Date());

    const { data, isLoading, isError } = useQuery({
        queryKey: ['finance-dashboard', currentDate.getMonth(), currentDate.getFullYear()],
        queryFn: async () => {
            const response = await api.get('/finance/dashboard', {
                params: {
                    month: currentDate.getMonth() + 1,
                    year: currentDate.getFullYear()
                }
            });
            return response.data;
        }
    });

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(cents / 100);
    };

    const calculateChange = (current: number, previous: number) => {
        if (!previous) return '0.0';
        return ((current - previous) / previous * 100).toFixed(1);
    };

    // Only show skeleton if loading AND NOT error
    if (isLoading && !isError) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-32 rounded-xl" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Skeleton className="h-64 rounded-xl" />
                    <Skeleton className="h-64 rounded-xl" />
                </div>
            </div>
        );
    }

    const emptyStats = {
        currentMonth: {
            revenue: 0,
            expenses: 0,
            profit: 0,
            ordersCount: 0,
            averageTicket: 0,
            quotesCount: 0,
            conversionRate: 0,
        },
        previousMonth: {
            revenue: 0,
            expenses: 0,
            profit: 0,
            ordersCount: 0,
        },
        monthlyTrend: [],
        topProducts: [],
        recentOrders: []
    };

    // If error, use empty stats to show layout (User Request)
    const dashboardData = isError || !data ? emptyStats : data;

    if (isError) {
        // Show silent toast or console error, but don't block UI
        console.error('Erro ao carregar dados do dashboard financeiro:', isError);
        // Optional: toast.error('Não foi possível carregar os dados financeiros.');
    }

    const revenueChange = parseFloat(calculateChange(dashboardData.currentMonth.revenue, dashboardData.previousMonth.revenue));
    const profitChange = parseFloat(calculateChange(dashboardData.currentMonth.profit, dashboardData.previousMonth.profit));
    const ordersChange = parseFloat(calculateChange(dashboardData.currentMonth.ordersCount, dashboardData.previousMonth.ordersCount));

    // Calculate max revenue for chart scaling
    const maxRevenue = Math.max(...(dashboardData.monthlyTrend?.map((m: any) => m.revenue) || [0]));

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard Financeiro</h1>
                    <p className="text-gray-500">Visão geral das vendas e finanças</p>
                </div>
                <div className="flex items-center gap-2">
                    <MonthYearPicker date={currentDate} onDateChange={setCurrentDate} />
                </div>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500">Faturamento</p>
                            <p className="text-2xl font-bold mt-1">{formatCurrency(dashboardData.currentMonth.revenue)}</p>
                        </div>
                        <div className={`flex items-center gap-1 text-sm ${revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {revenueChange >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                            {Math.abs(revenueChange)}%
                        </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: '70%' }}></div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500">Lucro Bruto</p>
                            <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(dashboardData.currentMonth.profit)}</p>
                        </div>
                        <div className={`flex items-center gap-1 text-sm ${profitChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {profitChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            {Math.abs(profitChange)}%
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Margem: {dashboardData.currentMonth.revenue > 0 ? ((dashboardData.currentMonth.profit / dashboardData.currentMonth.revenue) * 100).toFixed(1) : '0.0'}%
                    </p>
                </div>

                <div className="bg-white rounded-xl border p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500">Pedidos</p>
                            <p className="text-2xl font-bold mt-1">{dashboardData.currentMonth.ordersCount}</p>
                        </div>
                        <div className={`flex items-center gap-1 text-sm ${ordersChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {ordersChange >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                            {Math.abs(ordersChange)}%
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Ticket Médio: {formatCurrency(dashboardData.currentMonth.averageTicket)}
                    </p>
                </div>

                <div className="bg-white rounded-xl border p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500">Taxa de Conversão</p>
                            <p className="text-2xl font-bold mt-1">{dashboardData.currentMonth.conversionRate}%</p>
                        </div>
                        <FileText className="h-5 w-5 text-purple-500" />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        {dashboardData.currentMonth.ordersCount} de {dashboardData.currentMonth.quotesCount} orçamentos
                    </p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Trend */}
                <div className="bg-white rounded-xl border p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-500" />
                            Faturamento Mensal
                        </h3>
                    </div>
                    <div className="flex items-end gap-3 h-48">
                        {dashboardData.monthlyTrend.map((month: any) => (
                            <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                                <div
                                    className="w-full bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600 relative group"
                                    style={{ height: `${maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0}%`, minHeight: '4px' }}
                                >
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                        {formatCurrency(month.revenue)}
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500">{month.month}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Products */}
                <div className="bg-white rounded-xl border p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Package className="h-5 w-5 text-green-500" />
                            Produtos Mais Vendidos (Ult. 3 meses)
                        </h3>
                    </div>
                    <div className="space-y-4">
                        {dashboardData.topProducts.length === 0 ? (
                            <div className="text-center text-gray-400 py-8">Nenhum produto vendido no período.</div>
                        ) : (
                            dashboardData.topProducts.map((product: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-gray-400 w-6">#{idx + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" title={product.name}>{product.name}</p>
                                        <p className="text-xs text-gray-400">{product.sold} caixas</p>
                                    </div>
                                    <span className="text-sm font-semibold">{formatCurrency(product.revenue)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-blue-500" />
                        Pedidos Recentes
                    </h3>
                    <a href="/dashboard/pedidos" className="text-sm text-blue-600 hover:underline">
                        Ver todos
                    </a>
                </div>
                <div className="divide-y">
                    {dashboardData.recentOrders.length === 0 ? (
                        <div className="text-center text-gray-400 py-8">Nenhum pedido recente.</div>
                    ) : (
                        dashboardData.recentOrders.map((order: any) => (
                            <div key={order.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-100 rounded-lg">
                                        <Users className="h-4 w-4 text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{order.customer}</p>
                                        <p className="text-sm text-gray-500">{new Date(order.date).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold">{formatCurrency(order.total)}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                        order.status === 'IN_SEPARATION' ? 'bg-yellow-100 text-yellow-700' :
                                            order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-700'
                                        }`}>
                                        {order.status === 'DELIVERED' ? 'Entregue' :
                                            order.status === 'IN_SEPARATION' ? 'Separando' :
                                                order.status === 'CONFIRMED' ? 'Confirmado' :
                                                    order.status === 'PENDING' ? 'Pendente' : order.status}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
