'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useStockEntries } from '@/hooks/useStockEntries';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import { ArrowLeft, Loader2, Plus, FileText, ExternalLink, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function StockEntriesPage() {
    const { entries, fetchEntries, isLoading, deleteEntry } = useStockEntries();
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
                                        <TableHead className="w-[120px] text-right">Ações</TableHead>
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
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => router.push(`/dashboard/estoque/entradas/${entry.id}`)}
                                                            title="Abrir detalhes"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </Button>

                                                        {entry.status === 'DRAFT' && (
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
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
                                                                            onClick={() => deleteEntry(entry.id)}
                                                                        >
                                                                            Excluir
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        )}
                                                    </div>
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
