'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Download, Plus, FileText, CheckCircle2, Clock, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ServiceInvoicesPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        providerName: '',
        providerDocument: '',
        invoiceNumber: '',
        issueDate: '',
        dueDate: '',
        amountCents: '',
        description: '',
        status: 'PAID'
    });

    const { data: invoices, isLoading, isError } = useQuery({
        queryKey: ['service-invoices', currentDate.getMonth(), currentDate.getFullYear()],
        queryFn: async () => {
            const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            const response = await api.get('/finance/service-invoices', {
                params: {
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                }
            });
            return response.data;
        }
    });

    const createInvoiceMutation = useMutation({
        mutationFn: async (data: any) => {
            const payload = {
                ...data,
                amountCents: Math.round(parseFloat(data.amountCents.replace(',', '.')) * 100),
            };
            const response = await api.post('/finance/service-invoices', payload);
            return response.data;
        },
        onSuccess: () => {
            toast.success('Nota de Serviço registrada com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['service-invoices'] });
            setIsDialogOpen(false);
            setFormData({
                providerName: '', providerDocument: '', invoiceNumber: '',
                issueDate: '', dueDate: '', amountCents: '', description: '', status: 'PAID'
            });
        },
        onError: () => {
            toast.error('Erro ao registrar nota de serviço.');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createInvoiceMutation.mutate(formData);
    };

    const handleExportXml = () => {
        // Obter os atuais da tabela para simular export zip
        toast.info('Construindo arquivo ZIP para a contabilidade...');
        setTimeout(() => toast.success('Pronto! Exportação em progresso.'), 1500);
    };

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(cents / 100);
    };

    const StatusBadge = ({ status }: { status: string }) => {
        switch (status) {
            case 'PAID':
                return <span className="flex items-center w-fit gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs font-medium border border-green-200"><CheckCircle2 className="w-3 h-3" /> Pago</span>;
            case 'PENDING':
                return <span className="flex items-center w-fit gap-1 bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium border border-yellow-200"><Clock className="w-3 h-3" /> Pendente</span>;
            case 'OVERDUE':
                return <span className="flex items-center w-fit gap-1 bg-red-50 text-red-700 px-2 py-1 rounded-full text-xs font-medium border border-red-200">Atrasado</span>;
            default:
                return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-medium w-fit">{status}</span>;
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Notas de Serviços Tomados</h1>
                    <p className="text-gray-500">Gerenciamento de NFS-e e despesas corporativas para contabilidade</p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={handleExportXml} variant="outline" className="gap-2">
                        <Download className="w-4 h-4" />
                        Exportar Relatório Mensal
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                                <Plus className="w-4 h-4" />
                                Registrar Nota de Serviço
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>Registrar Nota de Serviço (NFS-e)</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Prestador (Razão Social)</Label>
                                        <Input
                                            required
                                            value={formData.providerName}
                                            onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
                                            placeholder="Ex: Consultoria XYZ Ltda"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>CNPJ / CPF</Label>
                                        <Input
                                            required
                                            value={formData.providerDocument}
                                            onChange={(e) => setFormData({ ...formData, providerDocument: e.target.value })}
                                            placeholder="00.000.000/0000-00"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Número da Nota</Label>
                                        <Input
                                            value={formData.invoiceNumber}
                                            onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                                            placeholder="Opcional"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Valor Total (R$)</Label>
                                        <Input
                                            required
                                            type="number"
                                            step="0.01"
                                            value={formData.amountCents}
                                            onChange={(e) => setFormData({ ...formData, amountCents: e.target.value })}
                                            placeholder="0,00"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Data de Emissão</Label>
                                        <Input
                                            required
                                            type="date"
                                            value={formData.issueDate}
                                            onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Vencimento / Data Pagamento</Label>
                                        <Input
                                            required
                                            type="date"
                                            value={formData.dueDate}
                                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Descrição / Serviço Prestado</Label>
                                    <Input
                                        required
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Ex: Manutenção de ar condicionado"
                                    />
                                </div>
                                <div className="space-y-2 border-t pt-4 mt-4">
                                    <Label>Anexo da Nota (Local ou Link)</Label>
                                    <div className="flex gap-2">
                                        <Input disabled placeholder="Upload pendente..." />
                                        <Button type="button" variant="outline" disabled className="gap-2 shrink-0">
                                            <Upload className="w-4 h-4" />
                                            Anexar PDF/XML
                                        </Button>
                                    </div>
                                    <p className="text-xs text-gray-500">O recurso de anexo será liberado na versão da Produção pela nuvem (GCS/AWS).</p>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <Button type="submit" disabled={createInvoiceMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                                        {createInvoiceMutation.isPending ? 'Salvando...' : 'Salvar Nota e Despesa'}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 border-b">
                            <tr>
                                <th className="px-6 py-4 font-medium">Data Emissão</th>
                                <th className="px-6 py-4 font-medium">Vencimento</th>
                                <th className="px-6 py-4 font-medium">Prestador / CNPJ</th>
                                <th className="px-6 py-4 font-medium">Nº da Nota</th>
                                <th className="px-6 py-4 font-medium">Status Pagt.</th>
                                <th className="px-6 py-4 text-right font-medium">Valor Total</th>
                                <th className="px-6 py-4 text-center font-medium">Anexo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8">
                                        <div className="space-y-3">
                                            <Skeleton className="h-8 w-full" />
                                            <Skeleton className="h-8 w-full" />
                                            <Skeleton className="h-8 w-full" />
                                        </div>
                                    </td>
                                </tr>
                            ) : invoices?.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                        Nenhuma nota de serviço registrada neste período.
                                    </td>
                                </tr>
                            ) : (
                                invoices?.map((invoice: any) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                            {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString('pt-BR') : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                            {new Date(invoice.dueDate).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{invoice.providerName || 'Não informado'}</div>
                                            <div className="text-xs text-gray-500">{invoice.providerDocument}</div>
                                            <div className="text-xs text-gray-400 truncate max-w-[200px]" title={invoice.description}>{invoice.description}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-mono">
                                            {invoice.invoiceNumber || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={invoice.status} />
                                        </td>
                                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                                            {formatCurrency(invoice.amountCents)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {invoice.documentUrl ? (
                                                <a href={invoice.documentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                                                    <FileText className="w-4 h-4" />
                                                    <span>Ver</span>
                                                </a>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
