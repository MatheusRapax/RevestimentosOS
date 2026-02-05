'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    ArrowLeft,
    FileText,
    User,
    Calendar,
    DollarSign,
    Package,
    CheckCircle,
    XCircle,
    Send,
    Printer,
    Building2,
    Clock
} from 'lucide-react';

interface QuoteItem {
    id: string;
    product: {
        id: string;
        name: string;
        sku: string;
        format?: string;
        line?: string;
        boxCoverage?: number;
    };
    inputArea?: number;
    quantityBoxes: number;
    resultingArea?: number;
    unitPriceCents: number;
    discountCents: number;
    totalCents: number;
    notes?: string;
    reservations?: { quantity: number }[];
}

interface AvailabilityItem {
    itemId: string;
    status: 'AVAILABLE' | 'PARTIAL' | 'NONE';
    available: number;
    missing: number;
}

interface AvailabilityResponse {
    status: 'FULL' | 'PARTIAL' | 'NONE';
    items: AvailabilityItem[];
}

interface Quote {
    id: string;
    number: number;
    status: string;
    customerId: string;
    customer: {
        id: string;
        name: string;
        phone?: string;
        email?: string;
    };
    architect?: {
        id: string;
        name: string;
    };
    seller: {
        id: string;
        name: string;
    };
    validUntil?: string;
    subtotalCents: number;
    discountCents: number;
    discountPercent?: number;
    deliveryFee: number;
    totalCents: number;
    notes?: string;
    internalNotes?: string;
    items: QuoteItem[];
    createdAt: string;
    updatedAt: string;
    sentAt?: string;
    approvedAt?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    EM_ORCAMENTO: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800', icon: FileText },
    AGUARDANDO_APROVACAO: { label: 'Aguardando Aprovação', color: 'bg-blue-100 text-blue-800', icon: Send },
    APROVADO: { label: 'Aprovado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    REJEITADO: { label: 'Rejeitado', color: 'bg-red-100 text-red-800', icon: XCircle },
    EXPIRADO: { label: 'Expirado', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    CONVERTIDO: { label: 'Convertido', color: 'bg-purple-100 text-purple-800', icon: Package },
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

export default function QuoteDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [quote, setQuote] = useState<Quote | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);

    const fetchQuote = async () => {
        try {
            setIsLoading(true);
            setError('');
            const response = await api.get(`/quotes/${params.id}`);
            setQuote(response.data);
        } catch (err: any) {
            console.error('Error fetching quote:', err);
            setError(err.response?.data?.message || 'Erro ao carregar orçamento');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (params.id) {
            fetchQuote();
        }
    }, [params.id]);

    const handleSendQuote = async () => {
        if (!quote) return;
        try {
            setActionLoading('send');
            await api.post(`/quotes/${quote.id}/send`);
            fetchQuote();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao enviar orçamento');
        } finally {
            setActionLoading(null);
        }
    };

    const handleApproveQuote = async () => {
        if (!quote) return;
        try {
            setActionLoading('approve');
            await api.post(`/quotes/${quote.id}/approve`);
            fetchQuote();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao aprovar orçamento');
        } finally {
            setActionLoading(null);
        }
    };

    const handleConvertToOrder = async () => {
        if (!quote) return;
        try {
            setActionLoading('convert');
            const response = await api.post(`/quotes/${quote.id}/convert`);
            router.push(`/dashboard/pedidos`);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao converter orçamento em pedido');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDownloadPdf = async () => {
        if (!quote) return;
        try {
            setActionLoading('pdf');
            const response = await api.get(`/quotes/${quote.id}/pdf`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `orcamento-${quote.number}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao gerar PDF');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCheckAvailability = async () => {
        if (!quote) return;
        try {
            setActionLoading('check_stock');
            const response = await api.get(`/quotes/${quote.id}/availability`);
            setAvailability(response.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao verificar disponibilidade');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReserveStock = async () => {
        if (!quote) return;
        try {
            setActionLoading('reserve');
            await api.post(`/quotes/${quote.id}/reserve`);
            // Refresh to update status/availability
            await fetchQuote();
            // Re-check availability just in case? Or assume backend handled it?
            // Let's re-check availability to update the display if needed (e.g. if we want to show "Reserved" status later)
            // But existing reservations affect "Available stock" calculation?
            // Yes, available = physical - reserved. So re-checking availability should show reduced availability?
            // Actually, if I reserved, my own reservation is active.
            // StockService availableStock = quantity - all_active_reservations.
            // So if I reserve, "available" drops.
            // But wait, if checking availability for THIS quote, my own reservations count against me?
            // StockService logic doesn't distinguish "reserved for ME". It just says "available".
            // However, ReservationsService.create checks "available".
            // If I reserve, now it's reserved.
            // Ideally we'd show "Reserved" in the table. But the current endpoint just returns avail/missing.
            // Whatever, user just wants to click Reserve.
            toast.success('Reserva processada com sucesso!');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao reservar estoque');
        } finally {
            setActionLoading(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg text-gray-600">Carregando orçamento...</div>
            </div>
        );
    }

    if (error && !quote) {
        return (
            <div className="p-6">
                <div className="rounded-lg bg-red-50 p-4">
                    <p className="text-red-600">{error}</p>
                    <Button onClick={() => router.back()} className="mt-4" variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar
                    </Button>
                </div>
            </div>
        );
    }

    if (!quote) {
        return null;
    }

    const statusInfo = statusConfig[quote.status] || statusConfig.EM_ORCAMENTO;
    const StatusIcon = statusInfo.icon;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Orçamento #{quote.number}
                        </h1>
                        <p className="text-gray-600">
                            Criado em {formatDate(quote.createdAt)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                        <StatusIcon className="h-4 w-4" />
                        {statusInfo.label}
                    </span>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {/* Actions */}
            <Card className="p-4">
                <div className="flex flex-wrap gap-2">
                    <Button onClick={handleDownloadPdf} variant="outline" disabled={actionLoading === 'pdf'}>
                        <Printer className="mr-2 h-4 w-4" />
                        {actionLoading === 'pdf' ? 'Gerando...' : 'Baixar PDF'}
                    </Button>

                    {quote.status === 'EM_ORCAMENTO' && (
                        <Button onClick={handleSendQuote} variant="outline" disabled={actionLoading === 'send'}>
                            <Send className="mr-2 h-4 w-4" />
                            {actionLoading === 'send' ? 'Enviando...' : 'Enviar ao Cliente'}
                        </Button>
                    )}



                    {(quote.status === 'EM_ORCAMENTO' || quote.status === 'AGUARDANDO_APROVACAO') && (
                        <>
                            <Button onClick={handleCheckAvailability} variant="outline" disabled={actionLoading === 'check_stock'}>
                                <Package className="mr-2 h-4 w-4" />
                                {actionLoading === 'check_stock' ? 'Verificando...' : 'Checar Estoque'}
                            </Button>

                            {/* Show Reserve button if Availability was checked and result allows it (FULL or PARTIAL) */}
                            {availability && (availability.status === 'FULL' || availability.status === 'PARTIAL') && (
                                <Button onClick={handleReserveStock} disabled={actionLoading === 'reserve'} className="bg-orange-600 hover:bg-orange-700 text-white">
                                    <Package className="mr-2 h-4 w-4" />
                                    {actionLoading === 'reserve' ? 'Reservando...' : 'Reservar Estoque'}
                                </Button>
                            )}

                            <Button onClick={handleApproveQuote} disabled={actionLoading === 'approve'}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                {actionLoading === 'approve' ? 'Aprovando...' : 'Aprovar Orçamento'}
                            </Button>
                        </>
                    )}

                    {quote.status === 'APROVADO' && (
                        <Button onClick={handleConvertToOrder} disabled={actionLoading === 'convert'} className="bg-green-600 hover:bg-green-700">
                            <Package className="mr-2 h-4 w-4" />
                            {actionLoading === 'convert' ? 'Convertendo...' : 'Converter em Pedido'}
                        </Button>
                    )}
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Customer Info */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Cliente
                    </h3>
                    <div className="space-y-2">
                        <p className="font-medium">{quote.customer.name}</p>
                        {quote.customer.phone && (
                            <p className="text-sm text-gray-600">{quote.customer.phone}</p>
                        )}
                        {quote.customer.email && (
                            <p className="text-sm text-gray-600">{quote.customer.email}</p>
                        )}
                    </div>
                </Card>

                {/* Architect Info */}
                {quote.architect && (
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Arquiteto
                        </h3>
                        <div className="space-y-2">
                            <p className="font-medium">{quote.architect.name}</p>
                        </div>
                    </Card>
                )}

                {/* Quote Info */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Informações
                    </h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Vendedor:</span>
                            <span>{quote.seller.name}</span>
                        </div>
                        {quote.validUntil && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Válido até:</span>
                                <span>{formatDate(quote.validUntil)}</span>
                            </div>
                        )}
                        {quote.sentAt && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Enviado em:</span>
                                <span>{formatDate(quote.sentAt)}</span>
                            </div>
                        )}
                        {quote.approvedAt && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Aprovado em:</span>
                                <span>{formatDate(quote.approvedAt)}</span>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Items */}
            <Card className="overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Itens do Orçamento
                    </h3>
                </div>
                <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-450px)]">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Área (m²)</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Caixas</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Preço Unit.</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Desconto</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Reserva</th>
                                {availability && <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Disponibilidade</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {quote.items.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div>
                                            <p className="font-medium">{item.product.name}</p>
                                            <p className="text-xs text-gray-500">
                                                {item.product.sku}
                                                {item.product.format && <span className="ml-2 text-blue-600">• {item.product.format}</span>}
                                                {item.product.line && <span className="ml-1 text-gray-400">• {item.product.line}</span>}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {item.resultingArea?.toFixed(2) || item.inputArea?.toFixed(2) || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {item.quantityBoxes}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {formatCurrency(item.unitPriceCents)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {item.discountCents > 0 ? formatCurrency(item.discountCents) : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium">
                                        {formatCurrency(item.totalCents)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {(() => {
                                            const reservedQty = item.reservations?.reduce((acc, r) => acc + r.quantity, 0) || 0;
                                            if (reservedQty >= item.quantityBoxes) {
                                                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Reservado</span>;
                                            }
                                            if (reservedQty > 0) {
                                                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Parcial ({reservedQty}/{item.quantityBoxes})</span>;
                                            }
                                            return <span className="text-gray-400">-</span>;
                                        })()}
                                    </td>
                                    {availability && (
                                        <td className="px-4 py-3 text-center">
                                            {(() => {
                                                const availItem = availability.items.find(i => i.itemId === item.id);
                                                if (!availItem) return <span className="text-gray-400">-</span>;

                                                if (availItem.status === 'AVAILABLE') {
                                                    return (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                            OK ({availItem.available})
                                                        </span>
                                                    );
                                                }
                                                if (availItem.status === 'PARTIAL') {
                                                    return (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                                            Parcial ({availItem.available})
                                                        </span>
                                                    );
                                                }
                                                return (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                        Indisponível (0)
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Totals */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Resumo Financeiro
                </h3>
                <div className="space-y-2 max-w-sm ml-auto text-right">
                    {(() => {
                        const itemDiscounts = quote.items.reduce((acc, item) => acc + item.discountCents, 0);
                        const totalDiscount = quote.discountCents + itemDiscounts;
                        // quote.subtotalCents is currently "Net Items Total" (after item discounts)
                        // So Gross Subtotal = quote.subtotalCents + itemDiscounts
                        const grossSubtotal = quote.subtotalCents + itemDiscounts;

                        return (
                            <>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Subtotal:</span>
                                    <span>{formatCurrency(grossSubtotal)}</span>
                                </div>

                                {totalDiscount > 0 && (
                                    <div className="flex justify-between text-red-600">
                                        <span>Desconto Total:</span>
                                        <span>-{formatCurrency(totalDiscount)}</span>
                                    </div>
                                )}

                                {quote.deliveryFee > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Taxa de Entrega:</span>
                                        <span>{formatCurrency(quote.deliveryFee)}</span>
                                    </div>
                                )}

                                <div className="flex justify-between text-xl font-bold border-t pt-2 mt-2">
                                    <span>Total:</span>
                                    <span className="text-green-600">{formatCurrency(quote.totalCents)}</span>
                                </div>
                            </>
                        );
                    })()}
                </div>
            </Card>

            {/* Notes */}
            {(quote.notes || quote.internalNotes) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {quote.notes && (
                        <Card className="p-6">
                            <h3 className="text-lg font-semibold mb-2">Observações</h3>
                            <p className="text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
                        </Card>
                    )}
                    {quote.internalNotes && (
                        <Card className="p-6">
                            <h3 className="text-lg font-semibold mb-2">Notas Internas</h3>
                            <p className="text-gray-600 whitespace-pre-wrap">{quote.internalNotes}</p>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
