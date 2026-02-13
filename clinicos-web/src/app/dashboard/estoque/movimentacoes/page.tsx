'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    ArrowDownLeft,
    ArrowUpRight,
    Search,
    Clock,
    Play,
    Trash2,
    AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface StockMovement {
    id: string;
    type: 'IN' | 'OUT' | 'ADJUST';
    quantity: number;
    reason: string;
    createdAt: string;
    product: {
        name: string;
        unit: string;
    };
    invoiceNumber?: string;
    supplier?: string;
    orderId?: string;
    destinationName?: string;
}

interface MovementsResponse {
    data: StockMovement[];
    meta: {
        total: number;
        page: number;
        totalPages: number;
    };
}

interface PendingEntry {
    id: string;
    type: 'INVOICE' | 'MANUAL';
    status: string;
    invoiceNumber?: string;
    supplierName?: string;
    totalValue?: number;
    createdAt: string;
    _itemCount?: number;
}

interface PendingExit {
    id: string;
    type: string;
    status: string;
    destinationType: string;
    destinationName?: string;
    createdAt: string;
    _itemCount?: number;
}

export default function MovimentacoesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [isLoading, setIsLoading] = useState(true);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [meta, setMeta] = useState<MovementsResponse['meta'] | null>(null);

    // Pending items
    const [pendingEntries, setPendingEntries] = useState<PendingEntry[]>([]);
    const [pendingExits, setPendingExits] = useState<PendingExit[]>([]);
    const [loadingPending, setLoadingPending] = useState(true);

    // Filters
    const type = searchParams.get('type') || 'ALL';
    const page = Number(searchParams.get('page')) || 1;
    const search = searchParams.get('search') || '';

    useEffect(() => {
        fetchMovements();
        fetchPendingItems();
    }, [type, page, search]);

    const handleDeleteEntry = async (id: string) => {
        try {
            await api.delete(`/stock/entries/${id}`);
            fetchPendingItems();
        } catch (error: any) {
            console.error('Erro ao excluir rascunho:', error);
            const msg = error.response?.data?.message || 'Erro ao excluir rascunho. Tente novamente.';
            toast.error(msg);
        }
    };

    const handleDeleteExit = async (id: string) => {
        try {
            await api.delete(`/stock/exits/${id}`);
            fetchPendingItems();
        } catch (error: any) {
            console.error('Erro ao excluir rascunho:', error);
            const msg = error.response?.data?.message || 'Erro ao excluir rascunho. Tente novamente.';
            toast.error(msg);
        }
    };

    const fetchMovements = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (type !== 'ALL') params.append('type', type);
            if (page > 1) params.append('page', page.toString());
            if (search) params.append('productId', search);

            const { data } = await api.get<MovementsResponse>(`/stock/movements?${params.toString()}`);
            setMovements(data.data);
            setMeta(data.meta);
        } catch (error) {
            console.error('Erro ao buscar movimentações:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPendingItems = async () => {
        setLoadingPending(true);
        try {
            // Fetch draft entries
            const entriesRes = await api.get('/stock/entries?status=DRAFT&limit=10');
            setPendingEntries(entriesRes.data.data || []);

            // Fetch draft exits
            const exitsRes = await api.get('/stock/exits?status=DRAFT&limit=10');
            setPendingExits(exitsRes.data.data || []);
        } catch (error) {
            console.error('Erro ao buscar itens pendentes:', error);
        } finally {
            setLoadingPending(false);
        }
    };

    const handleTabChange = (val: string) => {
        const params = new URLSearchParams(searchParams);
        if (val === 'ALL') params.delete('type');
        else params.set('type', val);
        params.set('page', '1');
        router.push(`?${params.toString()}`);
    };

    const totalPending = pendingEntries.length + pendingExits.length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Movimentações de Estoque</h1>
                    <p className="text-muted-foreground">
                        Histórico completo de entradas, saídas e movimentações de produtos.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/dashboard/estoque/entradas/nova">
                        <Button className="bg-green-600 hover:bg-green-700">
                            <ArrowDownLeft className="mr-2 h-4 w-4" />
                            Nova Entrada
                        </Button>
                    </Link>
                    <Link href="/dashboard/estoque/saidas/nova">
                        <Button className="bg-red-600 hover:bg-red-700">
                            <ArrowUpRight className="mr-2 h-4 w-4" />
                            Nova Saída
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Pending Items Section */}
            {!loadingPending && totalPending > 0 && (
                <Card className="border-orange-200 bg-orange-50/50">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-orange-600" />
                            <CardTitle className="text-lg text-orange-800">
                                Trabalhos Pendentes ({totalPending})
                            </CardTitle>
                        </div>
                        <CardDescription className="text-orange-700">
                            Movimentações iniciadas que ainda não foram concluídas. Clique para retomar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Pending Entries */}
                            {pendingEntries.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium text-orange-800 mb-2 flex items-center gap-2">
                                        <ArrowDownLeft className="h-4 w-4" />
                                        Entradas em Rascunho
                                    </h4>
                                    <div className="grid gap-2">
                                        {pendingEntries.map((entry) => (
                                            <div
                                                key={entry.id}
                                                className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200 hover:border-orange-400 transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                                        <ArrowDownLeft className="h-5 w-5 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">
                                                            {entry.type === 'INVOICE' ? 'Nota Fiscal' : 'Entrada Manual'}
                                                            {entry.invoiceNumber && ` - ${entry.invoiceNumber}`}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {entry.supplierName || 'Sem fornecedor'}
                                                            {' • '}
                                                            {format(new Date(entry.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {entry.totalValue && entry.totalValue > 0 && (
                                                        <span className="text-sm font-medium text-muted-foreground">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.totalValue)}
                                                        </span>
                                                    )}

                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                                                title="Excluir rascunho"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Excluir Rascunho?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Esta ação não pode ser desfeita. O rascunho de entrada <strong>{entry.invoiceNumber ? `NF ${entry.invoiceNumber}` : 'Sem número'}</strong> e todos os seus itens serão removidos permanentemente.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                                                    onClick={() => handleDeleteEntry(entry.id)}
                                                                >
                                                                    Excluir
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>

                                                    <Button
                                                        size="sm"
                                                        onClick={() => router.push(`/dashboard/estoque/entradas/${entry.id}`)}
                                                    >
                                                        <Play className="h-4 w-4 mr-1" />
                                                        Retomar
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Pending Exits */}
                            {pendingExits.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium text-orange-800 mb-2 flex items-center gap-2">
                                        <ArrowUpRight className="h-4 w-4" />
                                        Saídas em Rascunho
                                    </h4>
                                    <div className="grid gap-2">
                                        {pendingExits.map((exit) => (
                                            <div
                                                key={exit.id}
                                                className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200 hover:border-orange-400 transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                                                        <ArrowUpRight className="h-5 w-5 text-red-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">
                                                            Saída - {exit.destinationType === 'SECTOR' ? 'Setor' :
                                                                exit.destinationType === 'ROOM' ? 'Sala' :
                                                                    exit.destinationType === 'PATIENT' ? 'Cliente' :
                                                                        exit.destinationType === 'ORDER' ? 'Pedido' : exit.destinationType}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {exit.destinationName || 'Sem destino definido'}
                                                            {' • '}
                                                            {format(new Date(exit.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">

                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                                                title="Excluir rascunho"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Excluir Rascunho?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Esta ação não pode ser desfeita. O rascunho de saída será removido permanentemente.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                                                    onClick={() => handleDeleteExit(exit.id)}
                                                                >
                                                                    Excluir
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>

                                                    <Button
                                                        size="sm"
                                                        onClick={() => router.push(`/dashboard/estoque/saidas/${exit.id}`)}
                                                    >
                                                        <Play className="h-4 w-4 mr-1" />
                                                        Retomar
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Main Movements Table */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <Tabs defaultValue={type} onValueChange={handleTabChange} className="w-[400px]">
                            <TabsList>
                                <TabsTrigger value="ALL">Todas</TabsTrigger>
                                <TabsTrigger value="IN">Entradas</TabsTrigger>
                                <TabsTrigger value="OUT">Saídas</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="relative w-full md:w-[300px]">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar produto..." className="pl-8" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Produto</TableHead>
                                    <TableHead className="text-right">Quantidade</TableHead>
                                    <TableHead>Documento / Motivo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : movements.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <AlertCircle className="h-8 w-8" />
                                                <p>Nenhuma movimentação encontrada.</p>
                                                <p className="text-sm">Crie uma entrada ou saída para começar.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    movements.map((mov) => (
                                        <TableRow key={mov.id}>
                                            <TableCell className="font-medium">
                                                {formatDate(mov.createdAt)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        mov.type === 'IN' ? 'default' :
                                                            mov.type === 'OUT' ? 'destructive' : 'secondary'
                                                    }
                                                    className={
                                                        mov.type === 'IN' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                                                            mov.type === 'OUT' ? 'bg-red-100 text-red-800 hover:bg-red-100' :
                                                                'bg-gray-100 text-gray-800 hover:bg-gray-100'
                                                    }
                                                >
                                                    {mov.type === 'IN' ? 'ENTRADA' :
                                                        mov.type === 'OUT' ? 'SAÍDA' : 'AJUSTE'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{mov.product?.name}</span>
                                                    <span className="text-xs text-muted-foreground">{mov.product?.unit}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {mov.quantity}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-sm">
                                                    <span>{mov.reason || '-'}</span>
                                                    {mov.invoiceNumber && (
                                                        <span className="text-xs text-muted-foreground">NF: {mov.invoiceNumber}</span>
                                                    )}
                                                    {mov.destinationName && (
                                                        <span className="text-xs text-muted-foreground">Destino: {mov.destinationName}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {meta && meta.totalPages > 1 && (
                        <div className="flex items-center justify-end space-x-2 py-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const p = new URLSearchParams(searchParams);
                                    p.set('page', (meta!.page - 1).toString());
                                    router.push(`?${p.toString()}`);
                                }}
                                disabled={meta.page <= 1}
                            >
                                Anterior
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                Página {meta.page} de {meta.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const p = new URLSearchParams(searchParams);
                                    p.set('page', (meta!.page + 1).toString());
                                    router.push(`?${p.toString()}`);
                                }}
                                disabled={meta.page >= meta.totalPages}
                            >
                                Próximo
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
