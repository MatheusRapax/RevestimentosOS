'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Package,
    Search,
    Filter,
    Eye,
    Truck,
    CheckCircle,
    Clock,
    XCircle,
    AlertCircle,
    MapPin,
    Calendar,
    User,
    FileText
} from 'lucide-react';

// Mock data for orders
const mockOrders = [
    {
        id: '1',
        number: 1,
        customer: { name: 'João Santos', type: 'PF', document: '555.666.777-88' },
        seller: { name: 'Carlos Vendedor' },
        status: 'CONFIRMED',
        subtotalCents: 79500,
        discountCents: 0,
        deliveryFee: 8000,
        totalCents: 87500,
        deliveryAddress: 'Rua Principal, 456 - São Paulo, SP',
        deliveryDate: '2026-01-31',
        createdAt: '2026-01-28',
        confirmedAt: '2026-01-28',
        items: [
            { product: 'Porcelanato Carrara 60x60', quantity: 5, area: 7.2 }
        ]
    },
    {
        id: '2',
        number: 2,
        customer: { name: 'Maria Oliveira', type: 'PF', document: '111.222.333-44' },
        seller: { name: 'Carlos Vendedor' },
        status: 'PENDING',
        subtotalCents: 318000,
        discountCents: 0,
        deliveryFee: 15000,
        totalCents: 333000,
        deliveryAddress: 'Rua das Flores, 123 - São Paulo, SP',
        deliveryDate: '2026-02-05',
        createdAt: '2026-01-28',
        items: [
            { product: 'Porcelanato Carrara 60x60', quantity: 20, area: 28.8 }
        ]
    },
    {
        id: '3',
        number: 3,
        customer: { name: 'Construtora ABC Ltda', type: 'PJ', document: '12.345.678/0001-99' },
        seller: { name: 'Maria Gerente' },
        status: 'IN_SEPARATION',
        subtotalCents: 895000,
        discountCents: 44750,
        deliveryFee: 0,
        totalCents: 850250,
        deliveryAddress: 'Av. Industrial, 1000 - Guarulhos, SP',
        deliveryDate: '2026-02-10',
        createdAt: '2026-01-27',
        confirmedAt: '2026-01-27',
        items: [
            { product: 'Piso Laminado Carvalho', quantity: 50, area: 118 },
            { product: 'Argamassa AC-III 20kg', quantity: 30, area: null }
        ]
    },
    {
        id: '4',
        number: 4,
        customer: { name: 'Pedro Costa', type: 'PF', document: '999.888.777-66' },
        seller: { name: 'Carlos Vendedor' },
        status: 'READY',
        subtotalCents: 47400,
        discountCents: 0,
        deliveryFee: 0,
        totalCents: 47400,
        deliveryAddress: null,
        deliveryDate: null,
        createdAt: '2026-01-26',
        confirmedAt: '2026-01-26',
        items: [
            { product: 'Rejunte Epóxi Branco 1kg', quantity: 6, area: null }
        ]
    },
    {
        id: '5',
        number: 5,
        customer: { name: 'Ana Ferreira', type: 'PF', document: '444.555.666-77' },
        seller: { name: 'Carlos Vendedor' },
        status: 'DELIVERED',
        subtotalCents: 179000,
        discountCents: 8950,
        deliveryFee: 12000,
        totalCents: 182050,
        deliveryAddress: 'Rua Nova, 789 - São Paulo, SP',
        deliveryDate: '2026-01-25',
        deliveredAt: '2026-01-25',
        createdAt: '2026-01-24',
        confirmedAt: '2026-01-24',
        items: [
            { product: 'Porcelanato Madeira Nogueira 20x120', quantity: 10, area: 12 }
        ]
    }
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    CONFIRMED: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    IN_SEPARATION: { label: 'Em Separação', color: 'bg-purple-100 text-purple-800', icon: Package },
    READY: { label: 'Pronto', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    DELIVERED: { label: 'Entregue', color: 'bg-gray-100 text-gray-800', icon: Truck },
    CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle },
};

function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(cents / 100);
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pt-BR');
}

export default function OrdersPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedOrder, setSelectedOrder] = useState<typeof mockOrders[0] | null>(null);

    const filteredOrders = mockOrders.filter(order => {
        const matchesSearch =
            order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.number.toString().includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        pending: mockOrders.filter(o => o.status === 'PENDING').length,
        inProgress: mockOrders.filter(o => ['CONFIRMED', 'IN_SEPARATION'].includes(o.status)).length,
        ready: mockOrders.filter(o => o.status === 'READY').length,
        delivered: mockOrders.filter(o => o.status === 'DELIVERED').length,
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
                    <p className="text-gray-500">Gerencie os pedidos de venda</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <Clock className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-sm text-yellow-600">Pendentes</p>
                            <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Package className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-blue-600">Em Andamento</p>
                            <p className="text-2xl font-bold text-blue-700">{stats.inProgress}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-green-600">Prontos p/ Retirada</p>
                            <p className="text-2xl font-bold text-green-700">{stats.ready}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <Truck className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Entregues (mês)</p>
                            <p className="text-2xl font-bold text-gray-700">{stats.delivered}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente ou número do pedido..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">Todos os Status</option>
                        <option value="PENDING">Pendente</option>
                        <option value="CONFIRMED">Confirmado</option>
                        <option value="IN_SEPARATION">Em Separação</option>
                        <option value="READY">Pronto</option>
                        <option value="DELIVERED">Entregue</option>
                        <option value="CANCELLED">Cancelado</option>
                    </select>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Pedido
                            </th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Cliente
                            </th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Entrega
                            </th>
                            <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total
                            </th>
                            <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Ações
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredOrders.map((order) => {
                            const status = statusConfig[order.status];
                            const StatusIcon = status.icon;
                            return (
                                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 rounded-lg">
                                                <FileText className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    #{order.number.toString().padStart(4, '0')}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {formatDate(order.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-gray-900">{order.customer.name}</p>
                                            <p className="text-sm text-gray-500">{order.customer.document}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                                            <StatusIcon className="h-4 w-4" />
                                            {status.label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {order.deliveryDate ? (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar className="h-4 w-4 text-gray-400" />
                                                <span>{formatDate(order.deliveryDate)}</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400">Retirada</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <p className="font-semibold text-gray-900">
                                            {formatCurrency(order.totalCents)}
                                        </p>
                                        {order.discountCents > 0 && (
                                            <p className="text-sm text-green-600">
                                                -{formatCurrency(order.discountCents)}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setSelectedOrder(order)}
                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="Ver detalhes"
                                        >
                                            <Eye className="h-4 w-4 text-gray-600" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {filteredOrders.length === 0 && (
                    <div className="p-12 text-center">
                        <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">Nenhum pedido encontrado</p>
                    </div>
                )}
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">
                                        Pedido #{selectedOrder.number.toString().padStart(4, '0')}
                                    </h2>
                                    <p className="text-gray-500">
                                        Criado em {formatDate(selectedOrder.createdAt)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <XCircle className="h-5 w-5 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Status */}
                            <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium ${statusConfig[selectedOrder.status].color}`}>
                                    {React.createElement(statusConfig[selectedOrder.status].icon, { className: 'h-4 w-4' })}
                                    {statusConfig[selectedOrder.status].label}
                                </span>
                            </div>

                            {/* Customer Info */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Cliente
                                </h3>
                                <div className="space-y-1 text-sm">
                                    <p><strong>{selectedOrder.customer.name}</strong></p>
                                    <p className="text-gray-600">{selectedOrder.customer.document}</p>
                                </div>
                            </div>

                            {/* Delivery Info */}
                            {selectedOrder.deliveryAddress && (
                                <div className="bg-blue-50 rounded-xl p-4">
                                    <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                        <Truck className="h-4 w-4" />
                                        Entrega
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-start gap-2">
                                            <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                            <span>{selectedOrder.deliveryAddress}</span>
                                        </div>
                                        {selectedOrder.deliveryDate && (
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-gray-400" />
                                                <span>Previsão: {formatDate(selectedOrder.deliveryDate)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Items */}
                            <div>
                                <h3 className="font-medium text-gray-900 mb-3">Itens do Pedido</h3>
                                <div className="space-y-2">
                                    {selectedOrder.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="font-medium">{item.product}</p>
                                                <p className="text-sm text-gray-500">
                                                    {item.quantity} {item.area ? `caixas (${item.area}m²)` : 'unidades'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="border-t pt-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Subtotal</span>
                                    <span>{formatCurrency(selectedOrder.subtotalCents)}</span>
                                </div>
                                {selectedOrder.discountCents > 0 && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Desconto</span>
                                        <span>-{formatCurrency(selectedOrder.discountCents)}</span>
                                    </div>
                                )}
                                {selectedOrder.deliveryFee > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Taxa de Entrega</span>
                                        <span>{formatCurrency(selectedOrder.deliveryFee)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                                    <span>Total</span>
                                    <span>{formatCurrency(selectedOrder.totalCents)}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                {selectedOrder.status === 'PENDING' && (
                                    <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                                        Confirmar Pedido
                                    </button>
                                )}
                                {selectedOrder.status === 'CONFIRMED' && (
                                    <button className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors">
                                        Iniciar Separação
                                    </button>
                                )}
                                {selectedOrder.status === 'IN_SEPARATION' && (
                                    <button className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                                        Marcar como Pronto
                                    </button>
                                )}
                                {selectedOrder.status === 'READY' && (
                                    <button className="flex-1 bg-gray-800 text-white py-2 px-4 rounded-lg hover:bg-gray-900 transition-colors">
                                        Registrar Entrega
                                    </button>
                                )}
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
