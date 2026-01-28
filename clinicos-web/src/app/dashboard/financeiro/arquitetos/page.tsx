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

// Mock data for architect commissions
const mockArchitects = [
    {
        id: '1',
        name: 'Arq. Marina Santos',
        email: 'marina@arquitetura.com.br',
        phone: '(11) 98765-4321',
        commissionPercent: 5,
        stats: {
            customersReferred: 12,
            ordersGenerated: 8,
            totalSalesValue: 4890000,
            commissionDue: 244500,
            commissionPaid: 180000,
            pendingPayment: 64500,
        },
    },
    {
        id: '2',
        name: 'Arq. Pedro Lima',
        email: 'pedro@limadesign.com.br',
        phone: '(11) 91234-5678',
        commissionPercent: 4,
        stats: {
            customersReferred: 8,
            ordersGenerated: 5,
            totalSalesValue: 3250000,
            commissionDue: 130000,
            commissionPaid: 130000,
            pendingPayment: 0,
        },
    },
    {
        id: '3',
        name: 'Arq. Carla Mendes',
        email: 'carla@mendescasa.com.br',
        phone: '(11) 99876-5432',
        commissionPercent: 5,
        stats: {
            customersReferred: 6,
            ordersGenerated: 4,
            totalSalesValue: 2780000,
            commissionDue: 139000,
            commissionPaid: 89000,
            pendingPayment: 50000,
        },
    },
    {
        id: '4',
        name: 'Arq. Roberto Alves',
        email: 'roberto@alvesarq.com.br',
        phone: '(11) 98888-7777',
        commissionPercent: 3,
        stats: {
            customersReferred: 4,
            ordersGenerated: 2,
            totalSalesValue: 1450000,
            commissionDue: 43500,
            commissionPaid: 0,
            pendingPayment: 43500,
        },
    },
];

const mockTotals = {
    totalArchitects: 4,
    totalCustomersReferred: 30,
    totalSalesValue: 12370000,
    totalCommissionDue: 557000,
    totalCommissionPaid: 399000,
    totalPending: 158000,
};

export default function ArquitetosComissoesPage() {
    const [period] = useState('month');
    const architects = mockArchitects;
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
                    <h1 className="text-2xl font-bold text-gray-900">Comissões de Arquitetos</h1>
                    <p className="text-gray-500">Gestão de parceiros e pagamento de comissões</p>
                </div>
                <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Janeiro 2026</span>
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
                            {architects.map((architect) => (
                                <tr key={architect.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                                <Building2 className="h-5 w-5 text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{architect.name}</p>
                                                <p className="text-sm text-gray-500">{architect.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-medium">
                                            <Percent className="h-3 w-3" />
                                            {architect.commissionPercent}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Users className="h-4 w-4 text-gray-400" />
                                            <span>{architect.stats.customersReferred}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <ShoppingCart className="h-4 w-4 text-gray-400" />
                                            <span>{architect.stats.ordersGenerated}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium">
                                        {formatCurrency(architect.stats.totalSalesValue)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-green-600 font-medium">
                                        {formatCurrency(architect.stats.commissionDue)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {architect.stats.pendingPayment > 0 ? (
                                            <span className="text-yellow-600 font-medium">
                                                {formatCurrency(architect.stats.pendingPayment)}
                                            </span>
                                        ) : (
                                            <span className="text-green-600 text-sm">Pago ✓</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {architect.stats.pendingPayment > 0 && (
                                            <button className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                                                Pagar
                                            </button>
                                        )}
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
