'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Package,
    Plus,
    Search,
    Filter,
    Eye,
    Truck,
    CheckCircle,
    Clock,
    XCircle,
    FileText,
    Building2,
    Calendar
} from 'lucide-react';

// Mock data for purchase orders
const mockPurchaseOrders = [
    {
        id: '1',
        number: 1,
        supplierName: 'Cerâmicas do Brasil Ltda',
        supplierCnpj: '12.345.678/0001-90',
        status: 'RECEIVED',
        totalCents: 1575000,
        expectedDate: '2026-01-25',
        receivedAt: '2026-01-25T10:30:00',
        nfeNumber: '123456',
        itemCount: 5,
        createdAt: '2026-01-20T14:00:00',
    },
    {
        id: '2',
        number: 2,
        supplierName: 'Porcelanatos Premium SA',
        supplierCnpj: '98.765.432/0001-10',
        status: 'CONFIRMED',
        totalCents: 2340000,
        expectedDate: '2026-02-05',
        receivedAt: null,
        nfeNumber: null,
        itemCount: 8,
        createdAt: '2026-01-28T09:00:00',
    },
    {
        id: '3',
        number: 3,
        supplierName: 'Materiais de Construção XYZ',
        supplierCnpj: '45.678.901/0001-23',
        status: 'SENT',
        totalCents: 890000,
        expectedDate: '2026-02-10',
        receivedAt: null,
        nfeNumber: null,
        itemCount: 3,
        createdAt: '2026-01-28T15:30:00',
    },
    {
        id: '4',
        number: 4,
        supplierName: 'Rejuntes & Argamassas Ltda',
        supplierCnpj: '11.222.333/0001-44',
        status: 'DRAFT',
        totalCents: 450000,
        expectedDate: null,
        receivedAt: null,
        nfeNumber: null,
        itemCount: 12,
        createdAt: '2026-01-28T16:00:00',
    },
];

const statusConfig = {
    DRAFT: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700', icon: FileText },
    SENT: { label: 'Enviado', color: 'bg-blue-100 text-blue-700', icon: Truck },
    CONFIRMED: { label: 'Confirmado', color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
    PARTIAL: { label: 'Parcial', color: 'bg-yellow-100 text-yellow-700', icon: Package },
    RECEIVED: { label: 'Recebido', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function PurchaseOrdersPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [orders] = useState(mockPurchaseOrders);

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.number.toString().includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(cents / 100);
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    const formatCNPJ = (cnpj: string) => {
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    };

    // Stats
    const stats = {
        draft: orders.filter(o => o.status === 'DRAFT').length,
        pending: orders.filter(o => ['SENT', 'CONFIRMED'].includes(o.status)).length,
        received: orders.filter(o => o.status === 'RECEIVED').length,
        total: orders.reduce((sum, o) => sum + o.totalCents, 0),
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pedidos de Compra</h1>
                    <p className="text-gray-500">Gerencie suas compras com fornecedores</p>
                </div>
                <button
                    onClick={() => router.push('/dashboard/compras/novo')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Novo Pedido
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <FileText className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.draft}</p>
                            <p className="text-sm text-gray-500">Rascunhos</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Clock className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.pending}</p>
                            <p className="text-sm text-gray-500">Pendentes</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.received}</p>
                            <p className="text-sm text-gray-500">Recebidos</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Package className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{formatCurrency(stats.total)}</p>
                            <p className="text-sm text-gray-500">Total em Compras</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por fornecedor ou número..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="h-5 w-5 text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Todos os status</option>
                            <option value="DRAFT">Rascunho</option>
                            <option value="SENT">Enviado</option>
                            <option value="CONFIRMED">Confirmado</option>
                            <option value="PARTIAL">Parcial</option>
                            <option value="RECEIVED">Recebido</option>
                            <option value="CANCELLED">Cancelado</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Pedido
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fornecedor
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Previsão
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredOrders.map((order) => {
                                const status = statusConfig[order.status as keyof typeof statusConfig];
                                const StatusIcon = status.icon;

                                return (
                                    <tr key={order.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium">PC-{String(order.number).padStart(4, '0')}</p>
                                                <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gray-100 rounded-lg">
                                                    <Building2 className="h-4 w-4 text-gray-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{order.supplierName}</p>
                                                    <p className="text-sm text-gray-500 font-mono">{order.supplierCnpj}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                                <StatusIcon className="h-3 w-3" />
                                                {status.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {order.expectedDate ? (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                    {formatDate(order.expectedDate)}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="font-semibold">{formatCurrency(order.totalCents)}</p>
                                            <p className="text-sm text-gray-500">{order.itemCount} itens</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => router.push(`/dashboard/compras/${order.id}`)}
                                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                title="Ver detalhes"
                                            >
                                                <Eye className="h-5 w-5 text-gray-600" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredOrders.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Nenhum pedido de compra encontrado</p>
                    </div>
                )}
            </div>
        </div>
    );
}
