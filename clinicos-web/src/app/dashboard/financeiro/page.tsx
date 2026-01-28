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
    ArrowDownRight
} from 'lucide-react';

// Mock financial data
const mockFinancialData = {
    currentMonth: {
        revenue: 15750000, // R$ 157.500
        expenses: 8945000, // R$ 89.450
        profit: 6805000, // R$ 68.050
        ordersCount: 47,
        averageTicket: 335106, // R$ 3.351,06
        quotesCount: 82,
        conversionRate: 57.3,
    },
    previousMonth: {
        revenue: 12890000,
        expenses: 7450000,
        profit: 5440000,
        ordersCount: 38,
    },
    topProducts: [
        { name: 'Porcelanato Carrara 60x60', sold: 245, revenue: 4312500 },
        { name: 'Porcelanato Madeira 20x120', sold: 189, revenue: 3214700 },
        { name: 'Piso Laminado Carvalho', sold: 156, revenue: 1389000 },
        { name: 'Rejunte Epóxi Branco', sold: 342, revenue: 512900 },
        { name: 'Argamassa AC-III 20kg', sold: 478, revenue: 478000 },
    ],
    recentOrders: [
        { id: '1', customer: 'Maria Silva', date: '2026-01-28', total: 457800, status: 'DELIVERED' },
        { id: '2', customer: 'João Construções', date: '2026-01-28', total: 1234500, status: 'IN_SEPARATION' },
        { id: '3', customer: 'Ana Ferreira', date: '2026-01-27', total: 289000, status: 'PENDING' },
        { id: '4', customer: 'Pedro Reforma ME', date: '2026-01-27', total: 567800, status: 'CONFIRMED' },
    ],
    monthlyTrend: [
        { month: 'Set', revenue: 9800000 },
        { month: 'Out', revenue: 11200000 },
        { month: 'Nov', revenue: 10500000 },
        { month: 'Dez', revenue: 14300000 },
        { month: 'Jan', revenue: 15750000 },
    ],
};

export default function FinanceiroPage() {
    const [period] = useState('month');
    const data = mockFinancialData;

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(cents / 100);
    };

    const calculateChange = (current: number, previous: number) => {
        return ((current - previous) / previous * 100).toFixed(1);
    };

    const revenueChange = parseFloat(calculateChange(data.currentMonth.revenue, data.previousMonth.revenue));
    const profitChange = parseFloat(calculateChange(data.currentMonth.profit, data.previousMonth.profit));
    const ordersChange = parseFloat(calculateChange(data.currentMonth.ordersCount, data.previousMonth.ordersCount));

    // Calculate max revenue for chart scaling
    const maxRevenue = Math.max(...data.monthlyTrend.map(m => m.revenue));

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard Financeiro</h1>
                    <p className="text-gray-500">Visão geral das vendas e finanças</p>
                </div>
                <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Janeiro 2026</span>
                </div>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border p-5">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500">Faturamento</p>
                            <p className="text-2xl font-bold mt-1">{formatCurrency(data.currentMonth.revenue)}</p>
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

                <div className="bg-white rounded-xl border p-5">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500">Lucro Bruto</p>
                            <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(data.currentMonth.profit)}</p>
                        </div>
                        <div className={`flex items-center gap-1 text-sm ${profitChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {profitChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            {Math.abs(profitChange)}%
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Margem: {((data.currentMonth.profit / data.currentMonth.revenue) * 100).toFixed(1)}%
                    </p>
                </div>

                <div className="bg-white rounded-xl border p-5">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500">Pedidos</p>
                            <p className="text-2xl font-bold mt-1">{data.currentMonth.ordersCount}</p>
                        </div>
                        <div className={`flex items-center gap-1 text-sm ${ordersChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {ordersChange >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                            {Math.abs(ordersChange)}%
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Ticket Médio: {formatCurrency(data.currentMonth.averageTicket)}
                    </p>
                </div>

                <div className="bg-white rounded-xl border p-5">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500">Taxa de Conversão</p>
                            <p className="text-2xl font-bold mt-1">{data.currentMonth.conversionRate}%</p>
                        </div>
                        <FileText className="h-5 w-5 text-purple-500" />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        {data.currentMonth.ordersCount} de {data.currentMonth.quotesCount} orçamentos
                    </p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Trend */}
                <div className="bg-white rounded-xl border p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-500" />
                            Faturamento Mensal
                        </h3>
                    </div>
                    <div className="flex items-end gap-3 h-48">
                        {data.monthlyTrend.map((month) => (
                            <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                                <div
                                    className="w-full bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600"
                                    style={{ height: `${(month.revenue / maxRevenue) * 100}%` }}
                                ></div>
                                <span className="text-xs text-gray-500">{month.month}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Products */}
                <div className="bg-white rounded-xl border p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Package className="h-5 w-5 text-green-500" />
                            Produtos Mais Vendidos
                        </h3>
                    </div>
                    <div className="space-y-4">
                        {data.topProducts.map((product, idx) => (
                            <div key={product.name} className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-400 w-6">#{idx + 1}</span>
                                <div className="flex-1">
                                    <p className="text-sm font-medium truncate">{product.name}</p>
                                    <p className="text-xs text-gray-400">{product.sold} unidades</p>
                                </div>
                                <span className="text-sm font-semibold">{formatCurrency(product.revenue)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl border overflow-hidden">
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
                    {data.recentOrders.map((order) => (
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
                                            order.status === 'CONFIRMED' ? 'Confirmado' : 'Pendente'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
