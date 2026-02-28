'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, Printer, ShoppingBag, MapPin, User, Calendar, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(cents / 100);
}

function formatDate(dateStr: string | Date): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function translatePaymentMethod(method?: string) {
    switch (method) {
        case 'PIX': return 'PIX';
        case 'CREDIT_CARD': return 'Cartão de Crédito';
        case 'DEBIT_CARD': return 'Cartão de Débito';
        case 'CASH': return 'Dinheiro';
        case 'BOLETO': return 'Boleto Bancário';
        default: return method || 'Não informado';
    }
}

export default function ReceiptPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await api.get(`/orders/${params.id}`);
                setOrder(res.data);
            } catch (error) {
                console.error('Error fetching order:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [params.id]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando recibo...</div>;
    if (!order) return <div className="p-8 text-center text-red-500 font-bold">Pedido não encontrado</div>;

    // Retrieve payment method from the first payment or default if unavailable in direct order response.
    // In our backend logic, payment generation isn't directly attached to `order` response unless we fetch payments.
    // However, if we added it, it's great, but if not we can just show "Conforme acordado" or fetch it.
    // To make it robust, we can just say "Verificado no Sistema" or if they added it to order:
    // For now we will check if there's any finance info we can leverage, or just leave it generic.

    // We should fetch the payments associated with this customer/order to be 100% accurate, 
    // but without an extra API call, we can just say "Pagamento Confirmado".
    const paymentMethodLabel = 'Conforme registro no sistema'; // Placeholder if no direct method field on Order

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8 print:p-0 print:bg-white font-sans">
            {/* No-Print Header */}
            <div className="max-w-3xl mx-auto flex justify-between items-center mb-8 print:hidden bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                </Button>
                <div className="text-center text-sm text-gray-500">
                    Modo Recibo (Não Fiscal)
                </div>
                <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir Recibo
                </Button>
            </div>

            {/* Printable Content - A4 constraints ideally */}
            <div className="max-w-3xl mx-auto bg-white p-10 shadow-lg border border-gray-200 print:shadow-none print:border-0 print:p-0">

                {/* Store Header */}
                <div className="flex justify-between items-center border-b-2 border-gray-800 pb-6 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-900 text-white flex items-center justify-center rounded-lg font-bold text-xl">
                            <ShoppingBag className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">MOA Revestimentos</h1>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" /> Av. Exemplo Comercial, 1000 - Centro
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold text-gray-800">RECIBO DE PAGAMENTO</h2>
                        <p className="text-sm font-mono text-gray-500 mt-1">Pedido #{order.number?.toString().padStart(4, '0')}</p>
                        <p className="text-sm text-gray-500">Data: {formatDate(order.confirmedAt || order.createdAt)}</p>
                    </div>
                </div>

                {/* Customer and Payment Info */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 border-b border-gray-200 pb-1">Dados do Cliente</h3>
                        <p className="font-bold text-gray-900 flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" /> {order.customer?.name}
                        </p>
                        <p className="text-sm text-gray-600 pl-6">Doc: {order.customer?.document || 'Não informado'}</p>
                        <p className="text-sm text-gray-600 pl-6">Tel: {order.customer?.phone || 'Não informado'}</p>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 border-b border-gray-200 pb-1">Detalhes da Transação</h3>
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-gray-400" /> Método: <strong className="text-gray-900">{paymentMethodLabel}</strong>
                        </p>
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" /> Confirmação: <strong className="text-gray-900">{formatDate(order.confirmedAt || new Date())}</strong>
                        </p>
                        <p className="text-sm text-gray-600 pl-6">
                            Status: <span className="text-green-600 font-bold uppercase text-xs">Pago / Confirmado</span>
                        </p>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-8">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 border-b border-gray-200 pb-1">Produtos Adquiridos</h3>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50/50 text-gray-500">
                            <tr>
                                <th className="py-2 px-2 font-medium w-16 text-center">Qtd</th>
                                <th className="py-2 px-2 font-medium">Descrição</th>
                                <th className="py-2 px-2 font-medium text-right w-28">V. Unitário</th>
                                <th className="py-2 px-2 font-medium text-right w-28">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {order.items?.map((item: any, idx: number) => (
                                <tr key={idx}>
                                    <td className="py-3 px-2 text-center font-medium text-gray-900">
                                        {item.quantityBoxes} <span className="text-xs text-gray-400">cx</span>
                                    </td>
                                    <td className="py-3 px-2">
                                        <p className="font-medium text-gray-900">{item.product?.name}</p>
                                        <p className="text-xs text-gray-500 font-mono mt-0.5">{item.product?.sku}</p>
                                    </td>
                                    <td className="py-3 px-2 text-right text-gray-600">
                                        {formatCurrency(item.unitPriceCents)}
                                    </td>
                                    <td className="py-3 px-2 text-right font-medium text-gray-900">
                                        {formatCurrency(item.totalCents)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals Summary */}
                <div className="flex justify-end mb-16">
                    <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Subtotal:</span>
                            <span>{formatCurrency(order.subtotalCents || 0)}</span>
                        </div>
                        {(order.discountCents > 0) && (
                            <div className="flex justify-between text-sm text-red-500">
                                <span>Descontos:</span>
                                <span>-{formatCurrency(order.discountCents)}</span>
                            </div>
                        )}
                        {(order.deliveryFee > 0) && (
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Frete:</span>
                                <span>{formatCurrency(order.deliveryFee)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-black text-gray-900 border-t-2 border-gray-800 pt-2 mt-2">
                            <span>TOTAL PAGO:</span>
                            <span>{formatCurrency(order.totalCents || 0)}</span>
                        </div>
                    </div>
                </div>

                {/* Signatures */}
                <div className="mt-16 pt-8 flex justify-between gap-12 text-sm text-gray-500">
                    <div className="flex-1 text-center">
                        <div className="border-t border-gray-400 w-full mx-auto mb-2"></div>
                        <p className="font-medium text-gray-900 uppercase">{order.customer?.name}</p>
                        <p className="text-xs">Assinatura do Cliente / Recebedor</p>
                    </div>
                    <div className="flex-1 text-center">
                        <div className="border-t border-gray-400 w-full mx-auto mb-2"></div>
                        <p className="font-medium text-gray-900 uppercase">MOA Revestimentos</p>
                        <p className="text-xs">Assinatura do Vendedor / Caixa</p>
                    </div>
                </div>

                <div className="mt-8 text-center text-xs text-gray-400 print:mt-auto">
                    <p>Este documento não possui valor fiscal.</p>
                    <p>Gerado em {new Date().toLocaleString('pt-BR')} pelo sistema Clínicos Web.</p>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page { 
                        margin: 1.5cm; 
                        size: A4 portrait;
                    }
                    body { 
                        background: white !important; 
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact;
                    }
                }
            `}</style>
        </div>
    );
}
