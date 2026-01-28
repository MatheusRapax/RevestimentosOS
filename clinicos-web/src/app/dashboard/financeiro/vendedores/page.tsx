'use client';

import React, { useState } from 'react';
import {
    Users,
    TrendingUp,
    DollarSign,
    ShoppingCart,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Trophy,
    Target
} from 'lucide-react';

// Mock data for seller performance
const mockSellers = [
    {
        id: '1',
        name: 'Carlos Silva',
        email: 'carlos@revestimentos.com',
        avatar: null,
        stats: {
            ordersCount: 18,
            quotesCount: 32,
            conversionRate: 56.3,
            totalRevenue: 5890000,
            averageTicket: 327222,
            commission: 294500,
        },
        trend: 12.5,
        rank: 1,
    },
    {
        id: '2',
        name: 'Ana Ferreira',
        email: 'ana@revestimentos.com',
        avatar: null,
        stats: {
            ordersCount: 15,
            quotesCount: 28,
            conversionRate: 53.6,
            totalRevenue: 4560000,
            averageTicket: 304000,
            commission: 228000,
        },
        trend: 8.2,
        rank: 2,
    },
    {
        id: '3',
        name: 'Ricardo Santos',
        email: 'ricardo@revestimentos.com',
        avatar: null,
        stats: {
            ordersCount: 10,
            quotesCount: 15,
            conversionRate: 66.7,
            totalRevenue: 3450000,
            averageTicket: 345000,
            commission: 172500,
        },
        trend: -3.4,
        rank: 3,
    },
    {
        id: '4',
        name: 'Juliana Costa',
        email: 'juliana@revestimentos.com',
        avatar: null,
        stats: {
            ordersCount: 4,
            quotesCount: 7,
            conversionRate: 57.1,
            totalRevenue: 1850000,
            averageTicket: 462500,
            commission: 92500,
        },
        trend: 25.0,
        rank: 4,
    },
];

const mockTotals = {
    totalRevenue: 15750000,
    totalOrders: 47,
    totalQuotes: 82,
    avgConversion: 57.3,
    totalCommission: 787500,
};

export default function VendedoresPage() {
    const [period] = useState('month');
    const sellers = mockSellers;
    const totals = mockTotals;

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(cents / 100);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Desempenho por Vendedor</h1>
                    <p className="text-gray-500">Análise de vendas e comissões da equipe</p>
                </div>
                <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Janeiro 2026</span>
                </div>
            </div>

            {/* Team Summary */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <DollarSign className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xl font-bold">{formatCurrency(totals.totalRevenue)}</p>
                            <p className="text-xs text-gray-500">Total Faturado</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <ShoppingCart className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xl font-bold">{totals.totalOrders}</p>
                            <p className="text-xs text-gray-500">Pedidos</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Target className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-xl font-bold">{totals.avgConversion}%</p>
                            <p className="text-xs text-gray-500">Conversão Média</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <Trophy className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-xl font-bold">{formatCurrency(totals.totalCommission)}</p>
                            <p className="text-xs text-gray-500">Comissões</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <Users className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                            <p className="text-xl font-bold">{sellers.length}</p>
                            <p className="text-xs text-gray-500">Vendedores</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sellers Ranking */}
            <div className="bg-white rounded-xl border overflow-hidden">
                <div className="p-4 border-b">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        Ranking de Vendedores
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pedidos</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Conversão</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Faturamento</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ticket Médio</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Comissão</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tendência</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {sellers.map((seller) => (
                                <tr key={seller.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${seller.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                                                seller.rank === 2 ? 'bg-gray-100 text-gray-700' :
                                                    seller.rank === 3 ? 'bg-orange-100 text-orange-700' :
                                                        'bg-gray-50 text-gray-500'
                                            }`}>
                                            {seller.rank}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                <span className="text-blue-700 font-medium">
                                                    {seller.name.split(' ').map(n => n[0]).join('')}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium">{seller.name}</p>
                                                <p className="text-sm text-gray-500">{seller.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="font-semibold">{seller.stats.ordersCount}</span>
                                        <span className="text-gray-400 text-sm"> / {seller.stats.quotesCount}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-sm font-medium ${seller.stats.conversionRate >= 60 ? 'bg-green-100 text-green-700' :
                                                seller.stats.conversionRate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                            }`}>
                                            {seller.stats.conversionRate}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-semibold">
                                        {formatCurrency(seller.stats.totalRevenue)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-600">
                                        {formatCurrency(seller.stats.averageTicket)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-green-600">
                                        {formatCurrency(seller.stats.commission)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className={`inline-flex items-center gap-1 text-sm ${seller.trend >= 0 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                            {seller.trend >= 0 ? (
                                                <ArrowUpRight className="h-4 w-4" />
                                            ) : (
                                                <ArrowDownRight className="h-4 w-4" />
                                            )}
                                            {Math.abs(seller.trend)}%
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
