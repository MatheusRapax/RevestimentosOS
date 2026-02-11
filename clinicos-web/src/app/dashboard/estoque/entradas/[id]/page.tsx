'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FiscalTotalsForm } from '../nova/components/fiscal-totals-form';
import { ItemsGrid } from '../nova/components/items-grid';
import { useStockEntries } from '@/hooks/useStockEntries';
import { ArrowLeft, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EditEntryPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default function EditEntryPage({ params }: EditEntryPageProps) {
    const { id } = use(params);
    const router = useRouter();
    const { getEntry, currentEntry, addItem, removeItem, updateEntry, confirmEntry, error, isLoading } = useStockEntries();
    const [isInitializing, setIsInitializing] = useState(true);

    useEffect(() => {
        const loadEntry = async () => {
            try {
                await getEntry(id);
            } catch (err) {
                console.error("Error loading entry:", err);
            } finally {
                setIsInitializing(false);
            }
        };
        loadEntry();
    }, [id]);

    const handleConfirm = async () => {
        if (!id) return;
        try {
            await confirmEntry(id);
            router.push('/dashboard/estoque/movimentacoes');
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateEntry = async (data: any) => {
        if (!id) return;
        try {
            await updateEntry(id, data);
        } catch (err) {
            console.error(err);
        }
    };

    if (isInitializing) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!currentEntry) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/estoque/movimentacoes">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Entrada não encontrada</h1>
                    </div>
                </div>
                <div className="bg-destructive/15 text-destructive p-4 rounded-md">
                    Não foi possível carregar os dados desta entrada. Verifique se o ID está correto ou se ela foi excluída.
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/estoque/movimentacoes">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Continuar Entrada</h1>
                    <p className="text-muted-foreground">
                        Edite os dados e adicione itens à entrada em rascunho.
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-destructive/15 text-destructive p-3 rounded-md flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {error}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Dados da Entrada</span>
                        <div className="text-sm font-normal text-muted-foreground flex items-center gap-2">
                            <span>ID: {currentEntry.id}</span>
                            <span className="bg-secondary px-2 py-0.5 rounded text-xs uppercase">{currentEntry.status === 'DRAFT' ? 'Rascunho' : currentEntry.status}</span>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="font-semibold block">Tipo:</span>
                            {currentEntry.type === 'INVOICE' ? 'Nota Fiscal' : currentEntry.type}
                        </div>
                        <div>
                            <span className="font-semibold block">Nota Fiscal:</span>
                            {currentEntry.invoiceNumber || '-'} - Série {currentEntry.series || '-'}
                        </div>
                        <div>
                            <span className="font-semibold block">Data Chegada:</span>
                            {format(new Date(currentEntry.arrivalDate), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                        <div>
                            <span className="font-semibold block">Fornecedor:</span>
                            {currentEntry.supplierName || '-'}
                        </div>
                        {currentEntry.emissionDate && (
                            <div>
                                <span className="font-semibold block">Emissão:</span>
                                {format(new Date(currentEntry.emissionDate), "dd/MM/yyyy", { locale: ptBR })}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Completar Dados Fiscais</CardTitle>
                </CardHeader>
                <CardContent>
                    <FiscalTotalsForm
                        entryId={currentEntry.id}
                        initialData={currentEntry}
                        onUpdate={handleUpdateEntry}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>2. Itens da Entrada</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <ItemsGrid
                        items={currentEntry.items || []}
                        onAdd={(data) => addItem(currentEntry.id, data)}
                        onRemove={(itemId) => removeItem(currentEntry.id, itemId)}
                        isLoading={isLoading}
                    />

                    <div className="flex justify-between items-center bg-muted/20 p-4 rounded-md">
                        <div className="text-lg">
                            Total: <strong>
                                {currentEntry.totalValue ?
                                    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentEntry.totalValue)
                                    : 'R$ 0,00'}
                            </strong>
                        </div>
                        <Button
                            size="lg"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={handleConfirm}
                            disabled={isLoading || !currentEntry.items?.length}
                        >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Confirmar Entrada
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
