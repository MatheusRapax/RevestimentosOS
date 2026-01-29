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
    ArrowDownLeft,
    ArrowUpRight,
    Search,
    Filter,
    Calendar,
    ArrowLeftRight,
    Download
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function MovimentacoesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [isLoading, setIsLoading] = useState(true);
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [meta, setMeta] = useState<MovementsResponse['meta'] | null>(null);

    // Filters
    const type = searchParams.get('type') || 'ALL';
    const page = Number(searchParams.get('page')) || 1;
    const search = searchParams.get('search') || '';

    useEffect(() => {
        fetchMovements();
    }, [type, page, search]);

    const fetchMovements = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (type !== 'ALL') params.append('type', type);
            if (page > 1) params.append('page', page.toString());
            // Note: API might not support 'search' yet, but good to have ready
            if (search) params.append('productId', search); // Temporary mapping if needed

            const { data } = await api.get<MovementsResponse>(`/stock/movements?${params.toString()}`);
            setMovements(data.data);
            setMeta(data.meta);
        } catch (error) {
            console.error('Erro ao buscar movimentações:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTabChange = (val: string) => {
        const params = new URLSearchParams(searchParams);
        if (val === 'ALL') params.delete('type');
        else params.set('type', val);
        params.set('page', '1');
        router.push(`?${params.toString()}`);
    };

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

                        {/* Search placeholder - needs backend support for text search if not just product ID */}
                        <div className="relative w-full md:w-[300px]">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar (ID Produto)..." className="pl-8" />
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
                                            Nenhuma movimentação encontrada.
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

                    {/* Pagination - Simplified */}
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
