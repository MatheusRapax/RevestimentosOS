'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    ArrowLeft,
    Building2,
    Calendar,
    Package,
    CheckCircle,
    XCircle,
    Truck,
    FileText,
    MoreHorizontal,
    DollarSign,
    X
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PurchaseItem {
    id: string;
    productName: string; // backend might send product: { name } instead? Need to check payload.
    quantity: number;
    unitPriceCents: number;
    totalCents: number;
    product: {
        name: string;
        sku: string;
    }
}

interface PurchaseOrder {
    id: string;
    number: number;
    status: string;
    supplierName: string;
    supplierCnpj?: string;
    supplierPhone?: string;
    supplierEmail?: string;
    expectedDate?: string;
    receivedAt?: string;
    notes?: string;
    items: PurchaseItem[];
    subtotalCents: number;
    shippingCents: number;
    totalCents: number;
    salesOrderId?: string;
    createdAt: string;
}

const statusConfig = {
    DRAFT: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700', icon: FileText },
    SENT: { label: 'Enviado', color: 'bg-blue-100 text-blue-700', icon: Truck },
    CONFIRMED: { label: 'Confirmado', color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
    PARTIAL: { label: 'Parcial', color: 'bg-yellow-100 text-yellow-700', icon: Package },
    RECEIVED: { label: 'Recebido', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle },
};

function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(cents / 100);
}

function formatDate(dateStr?: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
}

export default function PurchaseOrderDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const queryClient = useQueryClient();
    const id = params?.id as string;

    const { data: order, isLoading } = useQuery<PurchaseOrder>({
        queryKey: ['purchase-order', id],
        queryFn: async () => {
            const response = await api.get(`/purchase-orders/${id}`);
            return response.data;
        },
        enabled: !!id
    });

    const updateStatusMutation = useMutation({
        mutationFn: async (status: string) => {
            await api.patch(`/purchase-orders/${id}/status`, { status });
        },
        onSuccess: () => {
            toast.success('Status atualizado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
        },
        onError: () => toast.error('Erro ao atualizar status')
    });

    const handleStatusChange = (newStatus: string) => {
        if (confirm(`Deseja alterar o status para ${statusConfig[newStatus as keyof typeof statusConfig]?.label}?`)) {
            updateStatusMutation.mutate(newStatus);
        }
    };

    // --- Expense Logic ---
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [expenseData, setExpenseData] = useState({
        description: '',
        amountCents: 0,
        dueDate: '',
        barCode: ''
    });

    const createExpenseMutation = useMutation({
        mutationFn: async () => {
            if (!order) return;
            await api.post('/expenses', {
                ...expenseData,
                type: 'SUPPLIER',
                purchaseOrderId: order.id,
                recipientName: order.supplierName
            });
        },
        onSuccess: () => {
            toast.success('Despesa lançada com sucesso!');
            setIsExpenseModalOpen(false);
            // Optionally refetch expenses or show success indication
        },
        onError: () => toast.error('Erro ao lançar despesa')
    });

    const openExpenseModal = () => {
        if (!order) return;
        setExpenseData({
            description: `Pagamento Pedido #${order.number}`,
            amountCents: order.totalCents,
            dueDate: new Date().toISOString().split('T')[0],
            barCode: ''
        });
        setIsExpenseModalOpen(true);
    };

    if (isLoading) {
        return <div className="p-8 text-center">Carregando detalhes...</div>;
    }

    if (!order) {
        return <div className="p-8 text-center">Pedido não encontrado</div>;
    }

    const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.DRAFT;
    const StatusIcon = status.icon;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            Pedido de Compra #{String(order.number).padStart(4, '0')}
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                                <StatusIcon className="h-4 w-4" />
                                {status.label}
                            </span>
                        </h1>
                        <p className="text-gray-500">Criado em {formatDate(order.createdAt)}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    {/* Edit Button */}
                    {['DRAFT', 'SENT'].includes(order.status) && (
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/dashboard/compras/editar/${id}`)}
                        >
                            Editar
                        </Button>
                    )}

                    {/* Launch Expense Button */}
                    {['SENT', 'CONFIRMED', 'RECEIVED'].includes(order.status) && (
                        <Button
                            variant="outline"
                            onClick={openExpenseModal}
                        >
                            <DollarSign className="mr-2 h-4 w-4" />
                            Lançar Despesa
                        </Button>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                Ações <MoreHorizontal className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {order.status === 'DRAFT' && (
                                <DropdownMenuItem onClick={() => handleStatusChange('SENT')}>
                                    Marcar como Enviado
                                </DropdownMenuItem>
                            )}
                            {order.status === 'SENT' && (
                                <DropdownMenuItem onClick={() => handleStatusChange('CONFIRMED')}>
                                    Marcar como Confirmado
                                </DropdownMenuItem>
                            )}
                            {['DRAFT', 'SENT', 'CONFIRMED'].includes(order.status) && (
                                <DropdownMenuItem
                                    onClick={() => handleStatusChange('CANCELLED')}
                                    className="text-red-600 focus:text-red-600"
                                >
                                    Cancelar Pedido
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Items */}
                    <Card className="overflow-hidden">
                        <div className="p-6 border-b bg-gray-50">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Package className="h-5 w-5 text-gray-500" />
                                Itens do Pedido
                            </h3>
                        </div>
                        <div className="divide-y">
                            {order.items.map((item) => (
                                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {item.product?.name || item.productName}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            SKU: {item.product?.sku}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium">
                                            {item.quantity} x {formatCurrency(item.unitPriceCents)}
                                        </p>
                                        <p className="text-sm font-bold text-gray-900">
                                            {formatCurrency(item.totalCents)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 bg-gray-50 border-t">
                            <div className="flex justify-between items-center text-lg font-bold">
                                <span>Total</span>
                                <span>{formatCurrency(order.totalCents)}</span>
                            </div>
                        </div>
                    </Card>

                    {/* Notes */}
                    {order.notes && (
                        <Card className="p-6">
                            <h3 className="font-semibold mb-2">Observações</h3>
                            <p className="text-gray-600 whitespace-pre-wrap">{order.notes}</p>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Supplier Info */}
                    <Card className="p-6">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-gray-500" />
                            Fornecedor
                        </h3>
                        <div className="space-y-3">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="font-medium">{order.supplierName}</p>
                                {order.supplierCnpj && <p className="text-sm text-gray-500">{order.supplierCnpj}</p>}
                            </div>
                            {order.supplierEmail && (
                                <p className="text-sm">
                                    <span className="text-gray-500">Email:</span> {order.supplierEmail}
                                </p>
                            )}
                            {order.supplierPhone && (
                                <p className="text-sm">
                                    <span className="text-gray-500">Tel:</span> {order.supplierPhone}
                                </p>
                            )}
                        </div>
                    </Card>

                    {/* Dates */}
                    <Card className="p-6">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-gray-500" />
                            Prazos
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Data do Pedido</span>
                                <span className="font-medium">{formatDate(order.createdAt)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Previsão de Entrega</span>
                                <span className="font-medium">{formatDate(order.expectedDate)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Recebimento</span>
                                <span className="font-medium">{formatDate(order.receivedAt)}</span>
                            </div>
                        </div>
                    </Card>

                    {/* Linked Sales Order */}
                    {order.salesOrderId && (
                        <Card className="p-6 border-blue-200 bg-blue-50">
                            <h3 className="font-semibold mb-4 text-blue-900">Venda Vinculada</h3>
                            <Button
                                variant="outline"
                                className="w-full bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
                                onClick={() => router.push(`/dashboard/pedidos?id=${order.salesOrderId}`)}
                            >
                                Ver Pedido de Venda
                            </Button>
                        </Card>
                    )}
                </div>
            </div>

            {/* Expense Modal */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h3 className="text-lg font-bold">Lançar no Contas a Pagar</h3>
                            <button onClick={() => setIsExpenseModalOpen(false)}>
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Descrição</label>
                                <input
                                    className="w-full border rounded px-3 py-2"
                                    value={expenseData.description}
                                    onChange={e => setExpenseData({ ...expenseData, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Valor (R$)</label>
                                <input
                                    type="number"
                                    className="w-full border rounded px-3 py-2"
                                    value={expenseData.amountCents / 100}
                                    onChange={e => setExpenseData({ ...expenseData, amountCents: Number(e.target.value) * 100 })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Vencimento</label>
                                <input
                                    type="date"
                                    className="w-full border rounded px-3 py-2"
                                    value={expenseData.dueDate}
                                    onChange={e => setExpenseData({ ...expenseData, dueDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Linha Digitável (Boleto)</label>
                                <input
                                    className="w-full border rounded px-3 py-2 font-mono text-sm"
                                    placeholder="Copie aqui o código de barras"
                                    value={expenseData.barCode}
                                    onChange={e => setExpenseData({ ...expenseData, barCode: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsExpenseModalOpen(false)}>Cancelar</Button>
                            <Button onClick={() => createExpenseMutation.mutate()} disabled={createExpenseMutation.isPending}>
                                {createExpenseMutation.isPending ? 'Salvando...' : 'Lançar Despesa'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
