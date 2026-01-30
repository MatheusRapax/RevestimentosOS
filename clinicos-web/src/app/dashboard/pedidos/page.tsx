'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api'; // Ensure this exists
import {
    Package,
    Search,
    Filter,
    Eye,
    Truck,
    CheckCircle,
    Clock,
    XCircle,
    MapPin,
    Calendar,
    User,
    FileText,
    DollarSign,
    Download,
    CreditCard,
    Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    AWAITING_STOCK: { label: 'Aguardando Estoque', color: 'bg-orange-100 text-orange-800', icon: Package },
    PARTIAL_READY: { label: 'Pronto Parcial', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
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
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
}

export default function OrdersPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'finance'>('details');
    const [isEditingDelivery, setIsEditingDelivery] = useState(false);
    const [deliveryEditDate, setDeliveryEditDate] = useState('');

    useEffect(() => {
        const id = searchParams.get('id');
        if (id && !selectedOrder) {
            setSelectedOrder({ id });
        }
    }, [searchParams]);

    // Fetch Orders
    const { data: orders = [], isLoading } = useQuery({
        queryKey: ['orders'],
        queryFn: async () => {
            const response = await api.get('/orders');
            return response.data;
        }
    });

    // Fetch Selected Order Details (Enriched)
    const { data: orderDetails, isLoading: isLoadingDetails, refetch: refetchDetails } = useQuery({
        queryKey: ['order', selectedOrder?.id],
        queryFn: async () => {
            if (!selectedOrder?.id) return null;
            const response = await api.get(`/orders/${selectedOrder.id}`);
            return response.data;
        },
        enabled: !!selectedOrder?.id
    });

    // Use enriched details if available, otherwise fallback to list data
    const displayOrder = orderDetails || selectedOrder;

    // Fetch Invoices for Selected Order
    const { data: invoices = [], refetch: refetchInvoices } = useQuery({
        queryKey: ['invoices', selectedOrder?.id],
        queryFn: async () => {
            if (!selectedOrder?.id) return [];
            const response = await api.get(`/finance/orders/${selectedOrder.id}/invoices`);
            return response.data;
        },
        enabled: !!selectedOrder?.id && activeTab === 'finance'
    });

    // Generate Invoice Mutation
    const generateInvoiceMutation = useMutation({
        mutationFn: async () => {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 3); // 3 days due date
            await api.post('/finance/invoices', {
                orderId: selectedOrder.id,
                dueDate: dueDate.toISOString()
            });
        },
        onSuccess: () => {
            toast.success('Boleto gerado com sucesso!');
            refetchInvoices();
        },
        onError: () => toast.error('Erro ao gerar boleto')
    });

    // Update Order Status Mutation
    const updateStatusMutation = useMutation({
        mutationFn: async (newStatus: string) => {
            await api.patch(`/orders/${selectedOrder.id}/status`, { status: newStatus });
        },
        onSuccess: () => {
            toast.success('Status atualizado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            // Update selected order locally
            setSelectedOrder((prev: any) => prev ? { ...prev, status: updateStatusMutation.variables } : null);
            refetchDetails();
        },
        onError: () => toast.error('Erro ao atualizar status')
    });

    // Update Delivery Mutation
    const updateDeliveryMutation = useMutation({
        mutationFn: async (date: string) => {
            await api.patch(`/orders/${selectedOrder.id}/delivery`, { deliveryDate: date });
        },
        onSuccess: () => {
            toast.success('Data de entrega atualizada com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            refetchDetails();
            setIsEditingDelivery(false);
        },
        onError: () => toast.error('Erro ao atualizar data de entrega')
    });

    const filteredOrders = orders.filter((order: any) => {
        const matchesSearch =
            order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.number.toString().includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        pending: orders.filter((o: any) => o.status === 'PENDING').length,
        awaitingStock: orders.filter((o: any) => o.status === 'AWAITING_STOCK').length,
        inProgress: orders.filter((o: any) => ['CONFIRMED', 'IN_SEPARATION', 'PARTIAL_READY'].includes(o.status)).length,
        ready: orders.filter((o: any) => o.status === 'READY').length,
        delivered: orders.filter((o: any) => o.status === 'DELIVERED').length,
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
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Package className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm text-orange-600">Aguardando Estoque</p>
                            <p className="text-2xl font-bold text-orange-700">{stats.awaitingStock}</p>
                        </div>
                    </div>
                </div>
                {/* ... other stats ... */}
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
                            <p className="text-sm text-gray-600">Entregues</p>
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
                        <option value="AWAITING_STOCK">Aguardando Estoque</option>
                        <option value="PARTIAL_READY">Pronto Parcial</option>
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
                            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido</th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Entrega</th>
                            <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {isLoading ? (
                            <tr><td colSpan={6} className="text-center py-4">Carregando...</td></tr>
                        ) : filteredOrders.map((order: any) => {
                            const status = statusConfig[order.status] || statusConfig['PENDING'];
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
                                                    #{order.number?.toString().padStart(4, '0')}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {formatDate(order.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-gray-900">{order.customer?.name}</p>
                                            <p className="text-sm text-gray-500">{order.customer?.document}</p>
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
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => { setSelectedOrder(order); setActiveTab('details'); }}
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
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            {isLoadingDetails && !orderDetails ? (
                                <div className="text-center py-4">Carregando detalhes...</div>
                            ) : (
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">
                                            Pedido #{displayOrder.number?.toString().padStart(4, '0')}
                                        </h2>
                                        <p className="text-gray-500">
                                            Criado em {formatDate(displayOrder.createdAt)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedOrder(null); router.replace('/dashboard/pedidos'); }}
                                        className="p-2 hover:bg-gray-100 rounded-lg"
                                    >
                                        <XCircle className="h-5 w-5 text-gray-500" />
                                    </button>
                                </div>
                            )}
                            {/* Tabs */}
                            <div className="flex border-b">
                                <button
                                    className={`px-4 py-2 font-medium text-sm ${activeTab === 'details' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
                                    onClick={() => setActiveTab('details')}
                                >
                                    Detalhes
                                </button>
                                <button
                                    className={`px-4 py-2 font-medium text-sm border-b-2 border-blue-600 text-blue-600`}
                                >
                                    Detalhes
                                </button>
                                {/* Financeiro tab disabled */}
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {activeTab === 'details' ? (
                                <>
                                    {/* Status */}
                                    <div className="flex items-center gap-3">
                                        <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium ${statusConfig[displayOrder.status]?.color}`}>
                                            {statusConfig[displayOrder.status]?.label}
                                        </span>
                                    </div>

                                    {/* Customer Info */}
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                            <User className="h-4 w-4" />
                                            Cliente
                                        </h3>
                                        <div className="space-y-1 text-sm">
                                            <p><strong>{displayOrder.customer?.name}</strong></p>
                                            <p className="text-gray-600">{displayOrder.customer?.document}</p>
                                        </div>
                                    </div>

                                    {/* Delivery Info */}
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                                <Truck className="h-4 w-4" />
                                                Entrega
                                            </h3>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setDeliveryEditDate(displayOrder.deliveryDate ? new Date(displayOrder.deliveryDate).toISOString().split('T')[0] : '');
                                                    setIsEditingDelivery(true);
                                                }}
                                            >
                                                <Edit className="h-4 w-4 text-blue-600" />
                                            </Button>
                                        </div>

                                        {isEditingDelivery ? (
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="date"
                                                    value={deliveryEditDate}
                                                    onChange={(e) => setDeliveryEditDate(e.target.value)}
                                                    className="border rounded px-2 py-1 text-sm"
                                                />
                                                <Button size="sm" onClick={() => updateDeliveryMutation.mutate(deliveryEditDate)}>
                                                    Salvar
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => setIsEditingDelivery(false)}>
                                                    Cancelar
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-1 text-sm">
                                                <p>
                                                    <span className="text-gray-500">Previsão: </span>
                                                    <strong>{displayOrder.deliveryDate ? formatDate(displayOrder.deliveryDate) : 'Não informada'}</strong>
                                                </p>
                                                <p>
                                                    <span className="text-gray-500">Endereço: </span>
                                                    {displayOrder.deliveryAddress || 'Retirada na loja'}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Purchase Orders (Back-to-Order) */}
                                    {displayOrder.purchaseOrders && displayOrder.purchaseOrders.length > 0 && (
                                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                            <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                                                <Package className="h-4 w-4" />
                                                Rastreio de Compras (Back-to-Order)
                                            </h3>
                                            <div className="space-y-2">
                                                {displayOrder.purchaseOrders.map((po: any) => (
                                                    <div key={po.id} className="bg-white p-3 rounded-lg text-sm border border-blue-100">
                                                        <div className="flex justify-between mb-1">
                                                            <span className="font-bold text-blue-800">Pedido Compra #{po.number}</span>
                                                            <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                                                {po.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-600">Fornecedor: {po.supplierName}</p>
                                                        <p className="text-gray-600">
                                                            Chegada Prevista: {po.expectedDate ? formatDate(po.expectedDate) : 'Indefinido'}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Items */}
                                    <div>
                                        <h3 className="font-medium text-gray-900 mb-3">Itens do Pedido</h3>
                                        <div className="space-y-2">
                                            {displayOrder.items?.map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                                    <div>
                                                        <p className="font-medium">{item.product?.name || 'Produto'}</p>
                                                        <p className="text-sm text-gray-500">
                                                            {item.quantityBoxes} caixas
                                                        </p>
                                                    </div>
                                                    <p className="font-medium">{formatCurrency(item.totalCents)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* Finance Tab */
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                            <DollarSign className="h-5 w-5" />
                                            Boletos e Faturas
                                        </h3>
                                        <Button
                                            onClick={() => generateInvoiceMutation.mutate()}
                                            disabled={generateInvoiceMutation.isPending}
                                            size="sm"
                                        >
                                            {generateInvoiceMutation.isPending ? 'Gerando...' : 'Gerar Novo Boleto'}
                                        </Button>
                                    </div>

                                    {invoices.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-xl">
                                            <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p>Nenhuma fatura gerada para este pedido.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {invoices.map((inv: any) => (
                                                <div key={inv.id} className="border rounded-lg p-4 flex justify-between items-center">
                                                    <div>
                                                        <p className="font-bold text-gray-900">{formatCurrency(inv.amountCents)}</p>
                                                        <p className="text-sm text-gray-500">Vence em {formatDate(inv.dueDate)}</p>
                                                        <div className="mt-1">
                                                            <span className={`text-xs px-2 py-1 rounded-full ${inv.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                                {inv.status === 'PAID' ? 'Pago' : 'Pendente'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {inv.pdfUrl && (
                                                            <Button variant="outline" size="sm" asChild>
                                                                <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer">
                                                                    <Download className="h-4 w-4 mr-1" />
                                                                    PDF
                                                                </a>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Totals (Always visible) */}
                            <div className="border-t pt-4 space-y-2 mt-4">
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total</span>
                                    <span>{displayOrder.totalCents ? formatCurrency(displayOrder.totalCents) : '-'}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                {displayOrder.status === 'PENDING' && (
                                    <button
                                        onClick={() => updateStatusMutation.mutate('CONFIRMED')}
                                        disabled={updateStatusMutation.isPending}
                                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        {updateStatusMutation.isPending ? 'Confirmando...' : 'Confirmar Pedido'}
                                    </button>
                                )}
                                {displayOrder.status === 'CONFIRMED' && (
                                    <button
                                        onClick={() => updateStatusMutation.mutate('IN_SEPARATION')}
                                        disabled={updateStatusMutation.isPending}
                                        className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                                    >
                                        {updateStatusMutation.isPending ? 'Processando...' : 'Iniciar Separação'}
                                    </button>
                                )}
                                {displayOrder.status === 'IN_SEPARATION' && (
                                    <button
                                        onClick={() => updateStatusMutation.mutate('READY')}
                                        disabled={updateStatusMutation.isPending}
                                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                    >
                                        {updateStatusMutation.isPending ? 'Processando...' : 'Marcar como Pronto'}
                                    </button>
                                )}
                                {displayOrder.status === 'READY' && (
                                    <button
                                        onClick={() => updateStatusMutation.mutate('DELIVERED')}
                                        disabled={updateStatusMutation.isPending}
                                        className="flex-1 bg-gray-800 text-white py-2 px-4 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50"
                                    >
                                        {updateStatusMutation.isPending ? 'Processando...' : 'Registrar Entrega'}
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
