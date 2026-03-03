'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Plus, AlertTriangle, AlertOctagon, CheckCircle, Clock, Eye } from 'lucide-react';
import Link from 'next/link';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface OccurrenceItem {
    id: string;
    product: { name: string; sku: string; unit: string };
    lot: { lotNumber: string } | null;
    quantity: number;
    reason: string | null;
}

interface Occurrence {
    id: string;
    number: number;
    type: string;
    status: string;
    createdAt: string;
    supplier: { name: string } | null;
    customer: { name: string } | null;
    order: { number: number } | null;
    items: OccurrenceItem[];
}

export default function OccurrencesPage() {
    const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Resolution Modal State
    const [selectedOcc, setSelectedOcc] = useState<Occurrence | null>(null);
    const [newStatus, setNewStatus] = useState<string>('');
    const [allocateToOrder, setAllocateToOrder] = useState<boolean>(true);
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchOccurrences = async () => {
        try {
            setIsLoading(true);
            setError('');
            const response = await api.get('/occurrences');
            setOccurrences(response.data);
        } catch (err: unknown) {
            console.error('Error fetching occurrences:', err);
            setError('Erro ao carregar ocorrências');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOccurrences();
    }, []);

    const handleUpdateStatus = async () => {
        if (!selectedOcc || !newStatus) return;
        try {
            setIsUpdating(true);
            await api.patch(`/occurrences/${selectedOcc.id}/status`, {
                status: newStatus,
                allocateToOrder: newStatus === 'RESOLVIDO' ? allocateToOrder : undefined
            });
            toast.success('Status da ocorrência atualizado com sucesso!');
            setSelectedOcc(null);
            fetchOccurrences();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Erro ao atualizar status');
        } finally {
            setIsUpdating(false);
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'RASCUNHO':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800"><Clock className="inline w-3 h-3 mr-1" />Rascunho</span>;
            case 'REPORTADO':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800"><AlertTriangle className="inline w-3 h-3 mr-1" />Reportado</span>;
            case 'AGUARDANDO_FORNECEDOR':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800"><Clock className="inline w-3 h-3 mr-1" />Aguardando Forn.</span>;
            case 'RESOLVIDO':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800"><CheckCircle className="inline w-3 h-3 mr-1" />Resolvido</span>;
            case 'REEMBOLSADO':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"><CheckCircle className="inline w-3 h-3 mr-1" />Reembolsado</span>;
            case 'CANCELADO':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800"><AlertOctagon className="inline w-3 h-3 mr-1" />Cancelado</span>;
            default:
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'RECEBIMENTO': return 'Recebimento';
            case 'ENTREGA': return 'Entrega';
            case 'DEFEITO': return 'Defeito / Garantia';
            default: return type;
        }
    };

    // Filter
    const filteredOccurrences = occurrences.filter(occ => {
        const searchLower = searchTerm.toLowerCase();
        return (
            occ.number.toString().includes(searchLower) ||
            occ.supplier?.name.toLowerCase().includes(searchLower) ||
            occ.customer?.name.toLowerCase().includes(searchLower) ||
            occ.items.some(item => item.product.name.toLowerCase().includes(searchLower))
        );
    });

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Ocorrências (Avarias e RMA)</h1>
                    <p className="text-gray-600 mt-1">Gerencie produtos avariados, defeitos e suporte com fornecedores/clientes.</p>
                </div>
                <Link href="/dashboard/estoque/ocorrencias/nova">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Ocorrência
                    </Button>
                </Link>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        placeholder="Buscar por número, produto, fornecedor ou cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center p-12">Carregando...</div>
            ) : error ? (
                <div className="text-red-500 p-4">{error}</div>
            ) : filteredOccurrences.length === 0 ? (
                <Card className="p-12 text-center">
                    <div className="text-gray-400 mb-4">
                        <AlertTriangle className="h-16 w-16 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma ocorrência encontrada</h3>
                </Card>
            ) : (
                <Card className="flex-1 flex flex-col min-h-0">
                    <div className="overflow-auto flex-1">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referência</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produtos</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredOccurrences.map((occ) => (
                                    <tr key={occ.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                            RMA-{occ.number}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {getTypeLabel(occ.type)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {occ.type === 'RECEBIMENTO' ? occ.supplier?.name : (occ.customer?.name || occ.order?.number)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <ul>
                                                {occ.items.map((item, idx) => (
                                                    <li key={idx}>- {item.quantity} {item.product.unit} of {item.product.name}</li>
                                                ))}
                                            </ul>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {getStatusBadge(occ.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(occ.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Dialog open={selectedOcc?.id === occ.id} onOpenChange={(open) => {
                                                if (open) {
                                                    setSelectedOcc(occ);
                                                    setNewStatus(occ.status);
                                                } else {
                                                    setSelectedOcc(null);
                                                }
                                            }}>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-900 border border-blue-200">
                                                        <Eye className="w-4 h-4 mr-2" /> Gerenciar
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-[425px]">
                                                    <DialogHeader>
                                                        <DialogTitle>Avaria RMA-{occ.number}</DialogTitle>
                                                        <DialogDescription>
                                                            Altere o status para processar trocas e reposições do fornecedor.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="grid gap-4 py-4">
                                                        <div className="flex flex-col gap-2">
                                                            <Label>Status Atual</Label>
                                                            {getStatusBadge(occ.status)}
                                                        </div>

                                                        <div className="flex flex-col gap-2">
                                                            <Label>Mudar para Status</Label>
                                                            <Select value={newStatus} onValueChange={setNewStatus} disabled={occ.status === 'RESOLVIDO' || occ.status === 'CANCELADO'}>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Selecione..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {occ.status === 'RASCUNHO' && <SelectItem value="REPORTADO">Reportar</SelectItem>}
                                                                    <SelectItem value="AGUARDANDO_FORNECEDOR">Aguardando Fornecedor</SelectItem>
                                                                    <SelectItem value="RESOLVIDO">Resolvido (Material Chegou!)</SelectItem>
                                                                    <SelectItem value="REEMBOLSADO">Reembolsado pelas Fábrica</SelectItem>
                                                                    <SelectItem value="CANCELADO">Cancelar RMA</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        {newStatus === 'RESOLVIDO' && occ.order && (
                                                            <div className="flex items-center space-x-2 p-4 bg-orange-50 border border-orange-200 rounded-lg shadow-inner">
                                                                <Checkbox
                                                                    id="allocate"
                                                                    checked={allocateToOrder}
                                                                    onCheckedChange={(c) => setAllocateToOrder(c as boolean)}
                                                                />
                                                                <div className="grid gap-1.5 leading-none">
                                                                    <label htmlFor="allocate" className="text-sm font-bold text-gray-900 cursor-pointer">
                                                                        Alocar Reposição p/ Pedido {occ.order?.number}
                                                                    </label>
                                                                    <p className="text-xs text-gray-600">
                                                                        Isso vinculará as caixas novas no pedido e atualizará o status do pedido para "Pronto". Se desmarcar, vai pra prateleira livre.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-end mt-4 gap-2">
                                                        <Button variant="outline" onClick={() => setSelectedOcc(null)}>
                                                            Sair
                                                        </Button>
                                                        <Button
                                                            disabled={occ.status === newStatus || isUpdating}
                                                            onClick={handleUpdateStatus}
                                                            className="bg-blue-600 hover:bg-blue-700 text-white"
                                                        >
                                                            {isUpdating ? 'Salvando...' : 'Confirmar e Processar'}
                                                        </Button>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
}
