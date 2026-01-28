'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Plus,
    FileText,
    Search,
    Eye,
    Send,
    CheckCircle,
    ShoppingCart,
    Trash2,
    Clock,
    XCircle,
    RotateCcw,
} from 'lucide-react';
import Link from 'next/link';

interface Quote {
    id: string;
    number: number;
    customer: { id: string; name: string };
    architect?: { id: string; name: string } | null;
    seller?: { id: string; name: string } | null;
    status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
    subtotalCents: number;
    discountCents: number;
    deliveryFeeCents: number;
    totalCents: number;
    validUntil?: string;
    items: any[];
    createdAt: string;
    updatedAt: string;
}

export default function OrcamentosPage() {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');

    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    const fetchQuotes = async () => {
        try {
            setIsLoading(true);
            setError('');
            const params: any = {};
            if (filterStatus !== 'ALL') params.status = filterStatus;

            const response = await api.get('/quotes', { params });
            setQuotes(response.data);
        } catch (err: any) {
            console.error('Error fetching quotes:', err);
            setError('Erro ao carregar orçamentos');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotes();
    }, [filterStatus]);

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(cents / 100);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const getStatusConfig = (status: Quote['status']) => {
        const configs = {
            DRAFT: {
                label: 'Rascunho',
                className: 'bg-gray-100 text-gray-800',
                icon: FileText,
            },
            SENT: {
                label: 'Enviado',
                className: 'bg-blue-100 text-blue-800',
                icon: Send,
            },
            APPROVED: {
                label: 'Aprovado',
                className: 'bg-green-100 text-green-800',
                icon: CheckCircle,
            },
            REJECTED: {
                label: 'Rejeitado',
                className: 'bg-red-100 text-red-800',
                icon: XCircle,
            },
            EXPIRED: {
                label: 'Expirado',
                className: 'bg-amber-100 text-amber-800',
                icon: Clock,
            },
            CONVERTED: {
                label: 'Convertido',
                className: 'bg-purple-100 text-purple-800',
                icon: ShoppingCart,
            },
        };
        return configs[status] || configs.DRAFT;
    };

    const handleSendQuote = async (quoteId: string) => {
        try {
            setLoadingAction(quoteId);
            await api.post(`/quotes/${quoteId}/send`);
            setSuccessMessage('Orçamento enviado com sucesso!');
            fetchQuotes();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao enviar orçamento');
        } finally {
            setLoadingAction(null);
        }
    };

    const handleApproveQuote = async (quoteId: string) => {
        try {
            setLoadingAction(quoteId);
            await api.post(`/quotes/${quoteId}/approve`);
            setSuccessMessage('Orçamento aprovado com sucesso!');
            fetchQuotes();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao aprovar orçamento');
        } finally {
            setLoadingAction(null);
        }
    };

    const handleConvertToOrder = async (quoteId: string) => {
        try {
            setLoadingAction(quoteId);
            await api.post(`/quotes/${quoteId}/convert`);
            setSuccessMessage('Pedido criado com sucesso!');
            fetchQuotes();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao converter orçamento');
        } finally {
            setLoadingAction(null);
        }
    };

    const getActionButtons = (quote: Quote) => {
        const buttons = [];
        const isLoading = loadingAction === quote.id;

        buttons.push(
            <a
                key="pdf"
                href={`${process.env.NEXT_PUBLIC_API_URL}/quotes/${quote.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
            >
                <Button size="sm" variant="outline" title="Gerar PDF">
                    <FileText className="h-3 w-3 mr-1" />
                    PDF
                </Button>
            </a>
        );

        buttons.push(
            <Link key="view" href={`/dashboard/orcamentos/${quote.id}`}>
                <Button size="sm" variant="outline" disabled={isLoading}>
                    <Eye className="h-3 w-3 mr-1" />
                    Ver
                </Button>
            </Link>
        );

        if (quote.status === 'DRAFT') {
            buttons.push(
                <Button
                    key="send"
                    size="sm"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => handleSendQuote(quote.id)}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                    <Send className="h-3 w-3 mr-1" />
                    Enviar
                </Button>
            );
        }

        if (quote.status === 'SENT') {
            buttons.push(
                <Button
                    key="approve"
                    size="sm"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => handleApproveQuote(quote.id)}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Aprovar
                </Button>
            );
        }

        if (quote.status === 'APPROVED') {
            buttons.push(
                <Button
                    key="convert"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => handleConvertToOrder(quote.id)}
                    className="bg-purple-600 hover:bg-purple-700"
                >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Converter em Pedido
                </Button>
            );
        }

        return buttons;
    };

    if (isLoading && quotes.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg text-gray-600">Carregando orçamentos...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Orçamentos</h1>
                    <p className="text-gray-600 mt-1">
                        Gerencie orçamentos e converta em pedidos
                    </p>
                </div>
                <Link href="/dashboard/orcamentos/novo">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Orçamento
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center flex-wrap">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar por cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {[
                        { value: 'ALL', label: 'Todos' },
                        { value: 'DRAFT', label: 'Rascunho' },
                        { value: 'SENT', label: 'Enviados' },
                        { value: 'APPROVED', label: 'Aprovados' },
                        { value: 'CONVERTED', label: 'Convertidos' },
                    ].map((filter) => (
                        <Button
                            key={filter.value}
                            variant={filterStatus === filter.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilterStatus(filter.value)}
                        >
                            {filter.label}
                        </Button>
                    ))}
                </div>
            </div>

            {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
                    {successMessage}
                </div>
            )}

            {error && (
                <div className="rounded-lg bg-red-50 p-4">
                    <p className="text-red-600">{error}</p>
                    <Button onClick={fetchQuotes} className="mt-4" variant="outline">
                        Tentar novamente
                    </Button>
                </div>
            )}

            {quotes.length === 0 ? (
                <Card className="p-12 text-center">
                    <div className="text-gray-400 mb-4">
                        <FileText className="h-16 w-16 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Nenhum orçamento encontrado
                    </h3>
                    <p className="text-gray-600 mb-4">
                        Crie um novo orçamento para começar
                    </p>
                    <Link href="/dashboard/orcamentos/novo">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Criar Orçamento
                        </Button>
                    </Link>
                </Card>
            ) : (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Nº
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Cliente
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Arquiteto
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Itens
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Total
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Data
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {quotes.map((quote) => {
                                    const statusConfig = getStatusConfig(quote.status);
                                    const StatusIcon = statusConfig.icon;

                                    return (
                                        <tr key={quote.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-mono font-medium text-gray-900">
                                                    #{quote.number.toString().padStart(5, '0')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {quote.customer.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {quote.architect?.name || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`px-2 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${statusConfig.className}`}
                                                >
                                                    <StatusIcon className="h-3 w-3" />
                                                    {statusConfig.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {quote.items?.length || 0} itens
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {formatCurrency(quote.totalCents)}
                                                    </div>
                                                    {quote.discountCents > 0 && (
                                                        <div className="text-xs text-green-600">
                                                            -{formatCurrency(quote.discountCents)} desc.
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(quote.createdAt)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div className="flex gap-2">
                                                    {getActionButtons(quote)}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
}
