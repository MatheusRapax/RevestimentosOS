'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useStockMovements, StockMovement } from '@/hooks/useStockMovements';
import { StockEntryDialog } from '../components/stock-entry-dialog';
import { StockExitDialog } from '../components/stock-exit-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Loader2, Plus, Filter, RefreshCw, ArrowDownCircle, ArrowUpCircle, Settings2 } from 'lucide-react';
import Link from 'next/link';

import { NewStockEntryDialog } from '../components/new-stock-entry-dialog';
import { NewStockExitDialog } from '../components/new-stock-exit-dialog';
import { FileText, ClipboardList } from 'lucide-react';

export default function MovimentacoesPage() {
    const { movements, fetchMovements, isLoading, meta } = useStockMovements();
    const [isEntryOpen, setIsEntryOpen] = useState(false);
    const [isExitOpen, setIsExitOpen] = useState(false);

    useEffect(() => {
        fetchMovements();
    }, []);

    const getTypeBadge = (type: string, quantity: number) => {
        if (type === 'IN') return <Badge className="bg-green-600">Entrada</Badge>;
        if (type === 'OUT') return <Badge variant="destructive">Saída</Badge>;
        if (quantity > 0) return <Badge className="bg-blue-600">Ajuste (+)</Badge>;
        return <Badge className="bg-orange-600">Ajuste (-)</Badge>;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/estoque">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Movimentações</h1>
                        <p className="text-muted-foreground">
                            Histórico de entradas, saídas e ajustes de estoque.
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => fetchMovements()}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>

                    <Button
                        variant="outline"
                        className="border-green-600 text-green-600 hover:bg-green-50"
                        onClick={() => setIsEntryOpen(true)}
                    >
                        <ArrowDownCircle className="h-4 w-4 mr-2" />
                        Nova Entrada (NF)
                    </Button>

                    <Button
                        variant="outline"
                        className="border-red-600 text-red-600 hover:bg-red-50"
                        onClick={() => setIsExitOpen(true)}
                    >
                        <ArrowUpCircle className="h-4 w-4 mr-2" />
                        Nova Saída
                    </Button>


                </div>
            </div>

            <div className="flex gap-4">
                <Link href="/dashboard/estoque/entradas" className="flex-1">
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Notas Fiscais / Entradas</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">Ver histórico e rascunhos de entradas</div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/dashboard/estoque/saidas" className="flex-1">
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Requisições / Saídas</CardTitle>
                            <ClipboardList className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground">Ver histórico e rascunhos de saídas</div>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico Geral</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading && movements.length === 0 ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Produto</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Qtd</TableHead>
                                        <TableHead>Detalhes (NF / Destino)</TableHead>
                                        <TableHead>Lote</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {movements.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                Nenhuma movimentação registrada.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        movements.map((movement) => (
                                            <TableRow key={movement.id}>
                                                <TableCell>
                                                    {format(new Date(movement.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {movement.product.name}
                                                </TableCell>
                                                <TableCell>
                                                    {getTypeBadge(movement.type, movement.quantity)}
                                                </TableCell>
                                                <TableCell className={movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                                                    {movement.quantity > 0 ? '+' : ''}{movement.quantity} {movement.product.unit}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {movement.type === 'IN' && movement.invoiceNumber ? (
                                                        <span>NF: {movement.invoiceNumber} {movement.supplier && `(${movement.supplier})`}</span>
                                                    ) : movement.type === 'OUT' && movement.destinationType ? (
                                                        <span>{movement.destinationType === 'PATIENT' ? 'Paciente' : movement.destinationType}: {movement.destinationName}</span>
                                                    ) : (
                                                        <span>{movement.reason || '-'}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {movement.lot?.lotNumber || '-'}
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



            <NewStockEntryDialog
                open={isEntryOpen}
                onOpenChange={setIsEntryOpen}
                onSuccess={() => fetchMovements()}
            />

            <NewStockExitDialog
                open={isExitOpen}
                onOpenChange={setIsExitOpen}
                onSuccess={() => fetchMovements()}
            />
        </div>
    );
}
