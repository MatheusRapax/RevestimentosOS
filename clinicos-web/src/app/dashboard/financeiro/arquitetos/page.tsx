'use client';

import React, { useState } from 'react';
import {
    Building2,
    DollarSign,
    Users,
    ShoppingCart,
    Calendar,
    TrendingUp,
    FileText,
    Award,
    Percent
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export default function ArquitetosComissoesPage() {
    const [period] = useState('month');

    // Fetch real data
    const { data: architects = [], isLoading } = useQuery({
        queryKey: ['financial-architects', period],
        queryFn: async () => {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            // Format dates as YYYY-MM-DD for backend
            const startDate = firstDay.toISOString().split('T')[0];
            const endDate = lastDay.toISOString().split('T')[0];

            const response = await api.get('/dashboard/finance/architects', {
                params: { startDate, endDate }
            });
            return response.data;
        }
    });

    // Calculate totals on the fly
    const totals = architects.reduce((acc: any, curr: any) => ({
        totalArchitects: acc.totalArchitects + 1,
        totalCustomersReferred: acc.totalCustomersReferred + curr.stats.clientsCount,
        totalSalesValue: acc.totalSalesValue + curr.stats.totalSales,
        totalCommissionDue: acc.totalCommissionDue + curr.stats.commissionTotal,
        totalCommissionPaid: acc.totalCommissionPaid + 0, // Pending payment logic not fully implemented backend side yet
        totalPending: acc.totalPending + curr.stats.commissionTotal // Assuming all is pending for now
    }), {
        totalArchitects: 0,
        totalCustomersReferred: 0,
        totalSalesValue: 0,
        totalCommissionDue: 0,
        totalCommissionPaid: 0,
        totalPending: 0
    });

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(cents / 100);
    };

    if (isLoading) {
        return <div className="p-6">Loading...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Comissões de Arquitetos</h1>
                    <p className="text-gray-500">Gestão de parceiros e pagamento de comissões</p>
                </div>
                <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Mês Atual</span>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Building2 className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{totals.totalArchitects}</p>
                            <p className="text-xs text-gray-500">Arquitetos Parceiros</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <DollarSign className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{formatCurrency(totals.totalSalesValue)}</p>
                            <p className="text-xs text-gray-500">Vendas via Arquitetos</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Award className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{formatCurrency(totals.totalCommissionPaid)}</p>
                            <p className="text-xs text-gray-500">Comissões Pagas</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <FileText className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{formatCurrency(totals.totalPending)}</p>
                            <p className="text-xs text-gray-500">Pendente Pagamento</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Architects Table */}
            <div className="bg-white rounded-xl border overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-purple-500" />
                        Arquitetos Parceiros
                    </h3>
                    <button className="text-sm text-blue-600 hover:underline">
                        + Novo Arquiteto
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Arquiteto</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Taxa</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Clientes</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pedidos</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vendas</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Comissão</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pendente</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {architects.map((architect: any) => (
                                <tr key={architect.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                                <Building2 className="h-5 w-5 text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{architect.name}</p>
                                                {/* Email not always returned by backend for architects list optimization? Checking... it is not in my backend service map. */}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-medium">
                                            <Percent className="h-3 w-3" />
                                            {architect.commissionRate}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Users className="h-4 w-4 text-gray-400" />
                                            <span>{architect.stats.clientsCount}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <ShoppingCart className="h-4 w-4 text-gray-400" />
                                            <span>-</span> {/* Order count not returned in summary, only sales value */}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium">
                                        {formatCurrency(architect.stats.totalSales)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-green-600 font-medium">
                                        {formatCurrency(architect.stats.commissionTotal)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-yellow-600 font-medium">
                                            {formatCurrency(architect.stats.commissionTotal)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                                            Pagar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Commission Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                        <h4 className="font-medium text-blue-800">Sobre Comissões</h4>
                        <p className="text-sm text-blue-700 mt-1">
                            Comissões são calculadas automaticamente sobre o valor total dos pedidos confirmados
                            de clientes indicados pelo arquiteto. O percentual é definido no cadastro de cada parceiro.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
