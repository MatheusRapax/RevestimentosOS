'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useStockEntries } from '@/hooks/useStockEntries';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Loader2, Plus, FileText, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function StockEntriesPage() {
    const { entries, fetchEntries, isLoading } = useStockEntries();
    const router = useRouter();

    useEffect(() => {
        fetchEntries();
    }, []);

    const getStatusBadge = (status: string) => {
        if (status === 'DRAFT') return <Badge variant="secondary">Rascunho</Badge>;
        if (status === 'CONFIRMED') return <Badge className="bg-green-600">Confirmado</Badge>;
        if (status === 'CANCELED') return <Badge variant="destructive">Cancelado</Badge>;
        return <Badge>{status}</Badge>;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/estoque/movimentacoes">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Entradas de Estoque</h1>
                        <p className="text-muted-foreground">
                            Gerencie Notas Fiscais e entradas manuais.
                        </p>
                    </div>
                </div>
                <Link href="/dashboard/estoque/entradas/nova">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Entrada
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Entradas</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading && entries.length === 0 ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data Criação</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Nota Fiscal</TableHead>
                                        <TableHead>Fornecedor</TableHead>
                                        <TableHead>Valor Total</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="w-[100px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {entries.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                Nenhuma entrada registrada.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        entries.map((entry) => (
                                            <TableRow key={entry.id}>
                                                <TableCell>
                                                    {format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                </TableCell>
                                                <TableCell>
                                                    {entry.type === 'INVOICE' ? 'Nota Fiscal' :
                                                        entry.type === 'MANUAL' ? 'Manual' : entry.type}
                                                </TableCell>
                                                <TableCell>
                                                    {entry.invoiceNumber || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {entry.supplierName || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {entry.totalValue ?
                                                        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.totalValue)
                                                        : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(entry.status)}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => router.push(`/dashboard/estoque/entradas/${entry.id}`)}
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
