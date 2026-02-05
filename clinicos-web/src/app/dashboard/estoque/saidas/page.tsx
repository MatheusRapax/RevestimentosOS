'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useStockExits } from '@/hooks/useStockExits';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Loader2, Plus, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function StockExitsPage() {
    const { exits, fetchExits, isLoading } = useStockExits();
    const router = useRouter();

    useEffect(() => {
        fetchExits();
    }, []);

    const getStatusBadge = (status: string) => {
        if (status === 'DRAFT') return <Badge variant="secondary">Rascunho</Badge>;
        if (status === 'CONFIRMED') return <Badge className="bg-green-600">Confirmado</Badge>;
        if (status === 'REJECTED') return <Badge variant="destructive">Rejeitado</Badge>;
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
                        <h1 className="text-3xl font-bold tracking-tight">Saídas de Estoque</h1>
                        <p className="text-muted-foreground">
                            Gerencie requisições e baixas de estoque.
                        </p>
                    </div>
                </div>
                <Link href="/dashboard/estoque/saidas/nova">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Saída
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Saídas</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading && exits.length === 0 ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Destino</TableHead>
                                        <TableHead>Identificação</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="w-[100px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {exits.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                Nenhuma saída registrada.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        exits.map((exit) => (
                                            <TableRow key={exit.id}>
                                                <TableCell>
                                                    {format(new Date(exit.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                </TableCell>
                                                <TableCell>
                                                    {exit.type}
                                                </TableCell>
                                                <TableCell>
                                                    {exit.destinationType === 'SECTOR' ? 'Setor' :
                                                        exit.destinationType === 'ROOM' ? 'Sala' :
                                                            exit.destinationType === 'PATIENT' ? 'Paciente' : exit.destinationType}
                                                </TableCell>
                                                <TableCell>
                                                    {exit.destinationName || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(exit.status)}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => router.push(`/dashboard/estoque/saidas/${exit.id}`)}
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
