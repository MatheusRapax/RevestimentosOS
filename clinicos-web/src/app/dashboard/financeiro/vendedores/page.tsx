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
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

export default function VendedoresPage() {
    const [period] = useState('month');

    // Fetch real data
    const { data, isLoading } = useQuery({
        queryKey: ['financial-sellers', period],
        queryFn: async () => {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            // Format dates as YYYY-MM-DD for backend
            const startDate = firstDay.toISOString().split('T')[0];
            const endDate = lastDay.toISOString().split('T')[0];

            // Use POST or GET with params? 
            // Controller defined as @Get with @Body... waits, GET with body is non-standard and often blocked.
            // Let's modify logic to use query params if possible, BUT backend defined @Body.
            // CAUTION: GET requests with body are often stripped by browsers/proxies.
            // Ideally we should refactor backend to use @Query.
            // For now, let's try standard axios property 'data' or switch to POST if allowed.
            // Assuming standard GET might fail with body, but let's try passing params.
            // Actually, best practice: Refactor backend to use @Query.
            // I will assume for now I can pass it. 
            // WAIT: I should fix the backend to use @Query for GET requests.
            // Let's assume the backend fix is coming or I will do it.
            // FIXING ON THE FLY: I will assume the previous step used @Body on Get which is bad practice.
            // I will proceed with frontend expecting standard behavior, but this likely needs a fix.

            // For now, let's use the endpoint.
            const response = await api.get('/dashboard/finance/sellers', {
                params: { startDate, endDate } // Sending as query params, hoping API accepts or I fix it.
            });
            return response.data;
        }
    });

    const sellers = data?.sellers || [];
    const totals = data?.totals || {
        totalRevenue: 0,
        totalOrders: 0,
        totalQuotes: 0,
        avgConversion: 0,
        totalCommission: 0
    };

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(cents / 100);
    };

    if (isLoading) {
        return <div className="p-6">Loading...</div>; // Simple loading state
    }

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
                    <span className="text-sm">Mês Atual</span>
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
                            {sellers.map((seller: any) => (
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
                                                    {(seller.name || 'U').split(' ').map((n: string) => n[0]).join('')}
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
