'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
    DollarSign,
    Calendar,
    AlertTriangle,
    CheckCircle,
    Clock,
    Plus,
    Filter,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    PENDING: { label: 'A Vencer', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    OVERDUE: { label: 'Vencido', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
    PAID: { label: 'Pago', color: 'bg-green-100 text-green-800', icon: CheckCircle },
};

const typeLabels: Record<string, string> = {
    SUPPLIER: 'Fornecedor',
    OPERATIONAL: 'Operacional',
    TAX: 'Imposto',
    COMMISSION: 'Comissão',
    OTHER: 'Outro',
};

function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(cents / 100);
}

function formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
}

function getDaysUntilDue(dueDate: string): number {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ContasAPagarPage() {
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        description: '',
        amountCents: 0,
        dueDate: '',
        type: 'OPERATIONAL' as const,
        recipientName: '',
        barCode: ''
    });

    // Fetch Expenses
    const { data: expenses = [], isLoading } = useQuery({
        queryKey: ['expenses', statusFilter],
        queryFn: async () => {
            const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
            const response = await api.get(`/expenses${params}`);
            return response.data;
        }
    });

    // Fetch Dashboard Metrics
    const { data: metrics } = useQuery({
        queryKey: ['expenses-dashboard'],
        queryFn: async () => {
            const response = await api.get('/expenses/dashboard');
            return response.data;
        }
    });

    // Create Expense Mutation
    const createMutation = useMutation({
        mutationFn: async () => {
            await api.post('/expenses', formData);
        },
        onSuccess: () => {
            toast.success('Despesa registrada!');
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['expenses-dashboard'] });
            setShowModal(false);
            setFormData({ description: '', amountCents: 0, dueDate: '', type: 'OPERATIONAL', recipientName: '', barCode: '' });
        },
        onError: () => toast.error('Erro ao registrar despesa')
    });

    // Pay Expense Mutation
    const payMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.patch(`/expenses/${id}/pay`);
        },
        onSuccess: () => {
            toast.success('Despesa marcada como paga!');
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['expenses-dashboard'] });
        },
        onError: () => toast.error('Erro ao marcar como pago')
    });

    // Group expenses by status
    const groupedExpenses = {
        overdue: expenses.filter((e: any) => e.status === 'OVERDUE'),
        pending: expenses.filter((e: any) => e.status === 'PENDING'),
        paid: expenses.filter((e: any) => e.status === 'PAID'),
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Contas a Pagar</h1>
                    <p className="text-gray-500">Gerencie suas despesas e pagamentos</p>
                </div>
                <Button onClick={() => setShowModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Despesa
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-red-600">Total Vencido</p>
                            <p className="text-2xl font-bold text-red-700">
                                {formatCurrency(groupedExpenses.overdue.reduce((sum: number, e: any) => sum + e.amountCents, 0))}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <Clock className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-sm text-yellow-600">Total Pendente</p>
                            <p className="text-2xl font-bold text-yellow-700">
                                {formatCurrency(metrics?.totalPending || 0)}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-green-600">Pago (Este Mês)</p>
                            <p className="text-2xl font-bold text-green-700">
                                {formatCurrency(metrics?.totalPaid || 0)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">Todos os Status</option>
                    <option value="PENDING">A Vencer</option>
                    <option value="OVERDUE">Vencidos</option>
                    <option value="PAID">Pagos</option>
                </select>
            </div>

            {/* Expenses List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-gray-500">Carregando...</div>
                ) : expenses.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma despesa encontrada.</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Descrição</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Vencimento</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Valor</th>
                                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {expenses.map((expense: any) => {
                                const status = statusConfig[expense.status] || statusConfig['PENDING'];
                                const StatusIcon = status.icon;
                                const daysUntil = getDaysUntilDue(expense.dueDate);

                                return (
                                    <tr key={expense.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-gray-900">{expense.description}</p>
                                            {expense.recipientName && (
                                                <p className="text-sm text-gray-500">{expense.recipientName}</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-600">
                                                {typeLabels[expense.type] || expense.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-gray-400" />
                                                <span>{formatDate(expense.dueDate)}</span>
                                                {expense.status === 'PENDING' && daysUntil <= 3 && daysUntil >= 0 && (
                                                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                                                        {daysUntil === 0 ? 'Hoje' : `${daysUntil}d`}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                                                <StatusIcon className="h-4 w-4" />
                                                {status.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="font-semibold text-gray-900">
                                                {formatCurrency(expense.amountCents)}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {expense.status !== 'PAID' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => payMutation.mutate(expense.id)}
                                                    disabled={payMutation.isPending}
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                    Pagar
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add Expense Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h2 className="text-xl font-bold">Nova Despesa</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Ex: Conta de Luz, Fornecedor XYZ"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.amountCents / 100}
                                        onChange={(e) => setFormData({ ...formData, amountCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Vencimento *</label>
                                    <input
                                        type="date"
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="OPERATIONAL">Operacional</option>
                                    <option value="SUPPLIER">Fornecedor</option>
                                    <option value="TAX">Imposto</option>
                                    <option value="COMMISSION">Comissão</option>
                                    <option value="OTHER">Outro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Beneficiário</label>
                                <input
                                    type="text"
                                    value={formData.recipientName}
                                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                                    placeholder="Nome do beneficiário"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Linha Digitável (Boleto)</label>
                                <input
                                    type="text"
                                    value={formData.barCode}
                                    onChange={(e) => setFormData({ ...formData, barCode: e.target.value })}
                                    placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => setShowModal(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => createMutation.mutate()}
                                disabled={!formData.description || !formData.amountCents || !formData.dueDate || createMutation.isPending}
                            >
                                {createMutation.isPending ? 'Salvando...' : 'Salvar Despesa'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
