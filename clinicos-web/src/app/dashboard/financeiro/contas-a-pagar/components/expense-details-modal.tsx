import React from 'react';
import {
    X,
    FileText,
    ShoppingCart,
    Clock,
    AlertTriangle,
    CheckCircle,
    Calendar,
    DollarSign,
    Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    PENDING: { label: 'A Vencer', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    OVERDUE: { label: 'Vencido', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
    PAID: { label: 'Pago', color: 'bg-green-100 text-green-800', icon: CheckCircle },
};

function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(cents / 100);
}

function formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    // Use UTC to prevent timezone shifts for absolute dates
    const date = new Date(dateStr);
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleDateString('pt-BR');
}

export default function ExpenseDetailsModal({ expense, onClose, onPay }: { expense: any, onClose: () => void, onPay: () => void }) {
    if (!expense) return null;

    const status = statusConfig[expense.status] || statusConfig['PENDING'];
    const StatusIcon = status.icon;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-gray-500" />
                        Detalhes da Conta
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Header Info */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">{expense.description}</h3>
                                {expense.recipientName && (
                                    <p className="text-gray-500 mt-1">Beneficiário: {expense.recipientName}</p>
                                )}
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                                <StatusIcon className="h-4 w-4" />
                                {status.label}
                            </span>
                        </div>

                        <div className={`grid gap-6 mt-6 ${expense.paidAt ? 'grid-cols-3' : 'grid-cols-2'}`}>
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">Valor da Conta</p>
                                <p className="text-xl font-bold text-gray-900">{formatCurrency(expense.amountCents)}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-1">
                                    <Calendar className="h-4 w-4" /> Vencimento
                                </p>
                                <p className="text-xl font-bold text-gray-900">{formatDate(expense.dueDate)}</p>
                            </div>
                            {expense.paidAt && (
                                <div>
                                    <p className="text-sm font-medium text-green-600 mb-1 flex items-center gap-1">
                                        <CheckCircle className="h-4 w-4" /> Pago em
                                    </p>
                                    <p className="text-xl font-bold text-green-700">{formatDate(expense.paidAt)}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Nota Fiscal (StockEntry) */}
                    {expense.stockEntry && (
                        <div>
                            <h4 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-4 border-b pb-2">
                                <FileText className="h-5 w-5 text-blue-600" />
                                Origem: Nota Fiscal
                            </h4>
                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">Número da NF-e</p>
                                    <p className="font-semibold text-gray-900">{expense.stockEntry.invoiceNumber || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Data de Emissão (NF)</p>
                                    <p className="font-semibold text-gray-900">{formatDate(expense.stockEntry.invoiceDate)}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Pedido de Compra (PurchaseOrder) */}
                    {expense.purchaseOrder && (
                        <div>
                            <h4 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-4 border-b pb-2">
                                <ShoppingCart className="h-5 w-5 text-purple-600" />
                                Pedido de Compra Vinculado
                            </h4>

                            <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 flex justify-between items-center mb-4">
                                <div>
                                    <p className="text-sm text-gray-500">Pedido #{expense.purchaseOrder.number}</p>
                                    <p className="font-bold text-gray-900">
                                        {expense.purchaseOrder.supplier?.name || expense.purchaseOrder.supplierName || 'Fornecedor Desconhecido'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">Total do Pedido</p>
                                    <p className="font-bold text-gray-900">{formatCurrency(expense.purchaseOrder.totalCents)}</p>
                                </div>
                            </div>

                            {/* Itens do Pedido */}
                            {expense.purchaseOrder.items && expense.purchaseOrder.items.length > 0 && (
                                <div className="border rounded-xl bg-white overflow-hidden">
                                    <table className="w-full text-sm text-left text-gray-500">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3">Produto</th>
                                                <th className="px-4 py-3 text-center">Pedido</th>
                                                <th className="px-4 py-3 text-center">Recebido</th>
                                                <th className="px-4 py-3 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {expense.purchaseOrder.items.map((item: any) => {
                                                const isFullyReceived = item.quantityReceived >= item.quantityOrdered;
                                                const isPartiallyReceived = item.quantityReceived > 0 && !isFullyReceived;

                                                return (
                                                    <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium text-gray-900 flex items-center gap-2">
                                                                <Package className="h-4 w-4 text-gray-400" />
                                                                {item.productName}
                                                            </div>
                                                            <div className="text-xs text-gray-400 ml-6">Cód: {item.productCode}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-medium">{item.quantityOrdered}</td>
                                                        <td className="px-4 py-3 text-center text-blue-600 font-medium">{item.quantityReceived}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            {isFullyReceived ? (
                                                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                                                    Entregue
                                                                </span>
                                                            ) : isPartiallyReceived ? (
                                                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                                                    Parcial
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                                                    Pendente
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 bg-white p-6 border-t flex justify-end gap-3 z-10 w-full rounded-b-2xl">
                    <Button variant="outline" onClick={onClose}>
                        Fechar
                    </Button>
                    {expense.status !== 'PAID' && (
                        <Button
                            onClick={onPay}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Marcar como Pago
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
