'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
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
    Copy,
    MoreHorizontal,
    Pencil,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { CompleteCustomerDialog } from '@/components/customers/complete-customer-dialog';

interface Quote {
    id: string;
    number: number;
    customer: {
        id: string;
        name: string;
        document?: string;
        address?: string;
        phone?: string;
        email?: string;
    };
    architect?: { id: string; name: string } | null;
    seller?: { id: string; name: string } | null;
    status: 'EM_ORCAMENTO' | 'AGUARDANDO_APROVACAO' | 'APROVADO' | 'REJEITADO' | 'EXPIRADO' | 'CONVERTIDO';
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
    const { user, activeClinic: activeClinicId } = useAuth();
    const queryClient = useQueryClient();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');

    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [isCompleteCustomerOpen, setIsCompleteCustomerOpen] = useState(false);
    const [pendingCustomer, setPendingCustomer] = useState<Quote['customer'] | null>(null);
    const [quoteToDuplicate, setQuoteToDuplicate] = useState<Quote | null>(null);
    const [quoteToReject, setQuoteToReject] = useState<Quote | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);

    const activeClinic = user?.clinics.find(c => c.id === activeClinicId);
    const userPermissions = activeClinic?.permissions || [];
    const isSuperAdmin = user?.isSuperAdmin;

    const hasPermission = (permission: string) => {
        return isSuperAdmin || userPermissions.includes(permission);
    };

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
            EM_ORCAMENTO: {
                label: 'Rascunho',
                className: 'bg-gray-100 text-gray-800',
                icon: FileText,
            },
            AGUARDANDO_APROVACAO: {
                label: 'Enviado',
                className: 'bg-blue-100 text-blue-800',
                icon: Send,
            },
            APROVADO: {
                label: 'Aprovado',
                className: 'bg-green-100 text-green-800',
                icon: CheckCircle,
            },
            REJEITADO: {
                label: 'Rejeitado',
                className: 'bg-red-100 text-red-800',
                icon: XCircle,
            },
            EXPIRADO: {
                label: 'Expirado',
                className: 'bg-amber-100 text-amber-800',
                icon: Clock,
            },
            CONVERTIDO: {
                label: 'Convertido',
                className: 'bg-purple-100 text-purple-800',
                icon: ShoppingCart,
            },
        };
        return configs[status] || configs.EM_ORCAMENTO;
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

    const handleApproveQuote = async (quote: Quote) => {
        try {
            setLoadingAction(quote.id);
            await api.post(`/quotes/${quote.id}/approve`);
            setSuccessMessage('Orçamento aprovado com sucesso!');
            fetchQuotes();
            // If customer has no document and no address, prompt to complete
            if (!quote.customer.document && !quote.customer.address) {
                setPendingCustomer(quote.customer);
                setIsCompleteCustomerOpen(true);
            }
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

            // Invalidate orders cache to ensure they appear in the orders list
            queryClient.invalidateQueries({ queryKey: ['orders'] });

            fetchQuotes();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao converter orçamento');
        } finally {
            setLoadingAction(null);
        }
    };

    const handleOpenPdf = async (quoteId: string) => {
        try {
            setLoadingAction(quoteId);
            const response = await api.get(`/quotes/${quoteId}/pdf`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            window.open(url, '_blank');
        } catch (err: any) {
            console.error('Error opening PDF:', err);
            setError(err.response?.data?.message || 'Erro ao abrir PDF');
        } finally {
            setLoadingAction(null);
        }
    };

    const handleDuplicateQuote = async () => {
        if (!quoteToDuplicate) return;
        try {
            setLoadingAction(quoteToDuplicate.id);
            const response = await api.post(`/quotes/${quoteToDuplicate.id}/duplicate`);
            setSuccessMessage('Orçamento duplicado com sucesso!');
            window.location.href = `/dashboard/orcamentos/${response.data.id}/editar`;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao duplicar orçamento');
            setQuoteToDuplicate(null);
            setQuoteToDuplicate(null);
            setLoadingAction(null);
        }
    };

    const handleDeleteQuote = async () => {
        if (!quoteToDelete) return;
        try {
            setLoadingAction(quoteToDelete.id);
            await api.delete(`/quotes/${quoteToDelete.id}`);
            setSuccessMessage('Orçamento excluído com sucesso!');
            fetchQuotes();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao excluir orçamento');
        } finally {
            setQuoteToDelete(null);
            setLoadingAction(null);
        }
    };

    const handleRejectQuote = async () => {
        if (!quoteToReject || !rejectReason.trim()) return;
        try {
            setLoadingAction(quoteToReject.id);
            await api.post(`/quotes/${quoteToReject.id}/reject`, { reason: rejectReason });
            setSuccessMessage('Orçamento rejeitado com sucesso!');
            fetchQuotes();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao rejeitar orçamento');
        } finally {
            setQuoteToReject(null);
            setRejectReason('');
            setLoadingAction(null);
        }
    };

    const handleReopenQuote = async (quoteId: string) => {
        try {
            setLoadingAction(quoteId);
            const response = await api.post(`/quotes/${quoteId}/reopen`);
            setSuccessMessage('Orçamento reaberto com sucesso!');
            window.location.href = `/dashboard/orcamentos/${response.data.id}/editar`;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao reabrir orçamento');
        } finally {
            setLoadingAction(null);
        }
    };

    const getActionButtons = (quote: Quote) => {
        const dropdownItems = [];
        const isLoading = loadingAction === quote.id;

        if (hasPermission('quote.create')) {
            dropdownItems.push(
                <DropdownMenuItem
                    key="duplicate"
                    disabled={isLoading}
                    onClick={() => setQuoteToDuplicate(quote)}
                    className="cursor-pointer"
                >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar
                </DropdownMenuItem>
            );
        }

        if (quote.status === 'EM_ORCAMENTO') {
            if (hasPermission('quote.update') || hasPermission('quote.send') || hasPermission('quote.delete')) {
                dropdownItems.push(<DropdownMenuSeparator key="sep-draft" />);
            }

            if (hasPermission('quote.update')) {
                dropdownItems.push(
                    <DropdownMenuItem
                        key="edit"
                        disabled={isLoading}
                        onClick={() => window.location.href = `/dashboard/orcamentos/${quote.id}/editar`}
                        className="text-amber-600 focus:text-amber-700 cursor-pointer focus:bg-amber-50"
                    >
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                    </DropdownMenuItem>
                );
            }

            if (hasPermission('quote.send')) {
                dropdownItems.push(
                    <DropdownMenuItem
                        key="send"
                        disabled={isLoading}
                        onClick={() => handleSendQuote(quote.id)}
                        className="text-blue-600 focus:text-blue-700 cursor-pointer"
                    >
                        <Send className="h-4 w-4 mr-2" />
                        Enviar
                    </DropdownMenuItem>
                );
            }

            if (hasPermission('quote.delete')) {
                dropdownItems.push(
                    <DropdownMenuItem
                        key="delete"
                        disabled={isLoading}
                        onClick={() => setQuoteToDelete(quote)}
                        className="text-red-600 focus:text-red-700 cursor-pointer focus:bg-red-50"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                    </DropdownMenuItem>
                );
            }
        }

        if (quote.status === 'AGUARDANDO_APROVACAO') {
            dropdownItems.push(<DropdownMenuSeparator key="sep-awaiting" />);
            
            if (hasPermission('quote.update')) {
                dropdownItems.push(
                    <DropdownMenuItem
                        key="approve"
                        disabled={isLoading}
                        onClick={() => handleApproveQuote(quote)}
                        className="text-green-600 focus:text-green-700 cursor-pointer focus:bg-green-50"
                    >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aprovar
                    </DropdownMenuItem>
                );
            }

            if (hasPermission('quote.update')) {
                dropdownItems.push(
                    <DropdownMenuItem
                        key="reopen"
                        disabled={isLoading}
                        onClick={() => handleReopenQuote(quote.id)}
                        className="text-amber-600 focus:text-amber-700 cursor-pointer focus:bg-amber-50"
                    >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Editar
                    </DropdownMenuItem>
                );
            }

            if (hasPermission('quote.update')) {
                dropdownItems.push(
                    <DropdownMenuItem
                        key="reject"
                        disabled={isLoading}
                        onClick={() => setQuoteToReject(quote)}
                        className="text-red-600 focus:text-red-700 cursor-pointer focus:bg-red-50"
                    >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rejeitar
                    </DropdownMenuItem>
                );
            }
        }

        if (quote.status === 'APROVADO') {
            dropdownItems.push(<DropdownMenuSeparator key="sep-approved" />);
            dropdownItems.push(
                <DropdownMenuItem
                    key="convert"
                    disabled={isLoading}
                    onClick={() => handleConvertToOrder(quote.id)}
                    className="text-purple-600 focus:text-purple-700 cursor-pointer focus:bg-purple-50"
                >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Converter em Pedido
                </DropdownMenuItem>
            );
        }

        return (
            <>
                <Button
                    key="pdf"
                    size="sm"
                    variant="outline"
                    title="Abrir PDF"
                    onClick={() => handleOpenPdf(quote.id)}
                    disabled={isLoading}
                >
                    <FileText className="h-3 w-3 mr-1" />
                    PDF
                </Button>

                <Link key="view" href={`/dashboard/orcamentos/${quote.id}`}>
                    <Button size="sm" variant="outline" disabled={isLoading} title="Ver Detalhes">
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                    </Button>
                </Link>

                {dropdownItems.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isLoading}>
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            {dropdownItems}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </>
        );
    };

    if (isLoading && quotes.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg text-gray-600">Carregando orçamentos...</div>
            </div>
        );
    }

    return (
        <>
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
                            { value: 'EM_ORCAMENTO', label: 'Rascunho' },
                            { value: 'AGUARDANDO_APROVACAO', label: 'Enviados' },
                            { value: 'APROVADO', label: 'Aprovados' },
                            { value: 'CONVERTIDO', label: 'Convertidos' },
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
                        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)]">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arquiteto</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Itens</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
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
                                                    <span className={`px-2 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${statusConfig.className}`}>
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
                                                        {(() => {
                                                            const itemDiscounts = quote.items?.reduce((acc, item: any) => acc + (item.discountCents || 0), 0) || 0;
                                                            const totalDiscount = quote.discountCents + itemDiscounts;
                                                            if (totalDiscount > 0) {
                                                                return (
                                                                    <div className="text-xs text-green-600">
                                                                        -{formatCurrency(totalDiscount)} desc.
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
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

            <Dialog open={!!quoteToDuplicate} onOpenChange={(open) => !open && setQuoteToDuplicate(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Duplicar Orçamento</DialogTitle>
                        <DialogDescription>
                            Deseja criar um novo orçamento (rascunho) baseado nos itens do orçamento #{quoteToDuplicate?.number}?
                            Os preços dos produtos serão atualizados para a tabela vigente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setQuoteToDuplicate(null)}>Cancelar</Button>
                        <Button 
                            onClick={handleDuplicateQuote} 
                            disabled={loadingAction === quoteToDuplicate?.id}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {loadingAction === quoteToDuplicate?.id ? 'Duplicando...' : 'Confirmar e Duplicar'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!quoteToDelete} onOpenChange={(open) => !open && setQuoteToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir Orçamento</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir o orçamento #{quoteToDelete?.number}? Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setQuoteToDelete(null)}>Cancelar</Button>
                        <Button 
                            onClick={handleDeleteQuote} 
                            disabled={loadingAction === quoteToDelete?.id}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {loadingAction === quoteToDelete?.id ? 'Excluindo...' : 'Excluir Orçamento'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!quoteToReject} onOpenChange={(open) => !open && setQuoteToReject(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rejeitar/Cancelar Orçamento</DialogTitle>
                        <DialogDescription>
                            Por favor, informe o motivo pelo qual este orçamento não foi aprovado.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Justificativa
                        </label>
                        <textarea
                            className="w-full min-h-[100px] rounded-md border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Ex: Cliente achou o frete caro, Desistiu da obra, etc..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setQuoteToReject(null)}>Cancelar</Button>
                        <Button 
                            onClick={handleRejectQuote} 
                            disabled={loadingAction === quoteToReject?.id || !rejectReason.trim()}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {loadingAction === quoteToReject?.id ? 'Salvando...' : 'Confirmar Rejeição'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <CompleteCustomerDialog
                open={isCompleteCustomerOpen}
                onOpenChange={(open) => {
                    setIsCompleteCustomerOpen(open);
                    if (!open) setPendingCustomer(null);
                }}
                customer={pendingCustomer}
                onCompleted={fetchQuotes}
                allowSkip
            />
        </>
    );
}
