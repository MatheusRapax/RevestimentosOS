'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExitHeaderForm } from '../nova/components/exit-header-form';
import { ExitItemsGrid } from '../nova/components/exit-items-grid'; // Check if this path is correct
import { useStockExits } from '@/hooks/useStockExits';
import { ArrowLeft, CheckCircle, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface EditExitPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default function EditExitPage({ params }: EditExitPageProps) {
    const { id } = use(params);
    const router = useRouter();
    const { getExit, currentExit, addItem, removeItem, confirmExit, deleteExit, error, isLoading } = useStockExits();
    const [isInitializing, setIsInitializing] = useState(true);

    useEffect(() => {
        const loadExit = async () => {
            try {
                await getExit(id);
            } catch (err) {
                console.error("Error loading exit:", err);
            } finally {
                setIsInitializing(false);
            }
        };
        loadExit();
    }, [id]);

    const handleConfirm = async () => {
        if (!id) return;
        try {
            await confirmExit(id);
            router.push('/dashboard/estoque/movimentacoes');
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        if (!confirm('Tem certeza que deseja excluir este rascunho de saída? Esta ação não pode ser desfeita.')) return;

        try {
            await deleteExit(id);
            router.push('/dashboard/estoque/movimentacoes');
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

    if (!currentExit) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/estoque/movimentacoes">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Saída não encontrada</h1>
                    </div>
                </div>
                <div className="bg-destructive/15 text-destructive p-4 rounded-md">
                    Não foi possível carregar os dados desta saída. Verifique se o ID está correto ou se ela foi excluída.
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
                    <h1 className="text-3xl font-bold tracking-tight">Editar Saída de Estoque</h1>
                    <p className="text-muted-foreground">
                        {currentExit.status === 'DRAFT'
                            ? 'Edite os dados e adicione itens à saída em rascunho.'
                            : 'Detalhes da saída de estoque.'}
                    </p>
                </div>
                {currentExit.status === 'DRAFT' && (
                    <div className="ml-auto">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDelete}
                            disabled={isLoading}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir Rascunho
                        </Button>
                    </div>
                )}
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
                        <div className="flex items-center gap-4">
                            <span>Dados da Saída</span>
                            <div className="text-sm font-normal text-muted-foreground flex items-center gap-2">
                                <span>ID: {currentExit.id}</span>
                                <span className="bg-secondary px-2 py-0.5 rounded text-xs uppercase">
                                    {currentExit.status === 'DRAFT' ? 'Rascunho' : currentExit.status}
                                </span>
                            </div>
                        </div>

                        {/* Button moved to header */}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Reuse Header Form but maybe read-only or pre-filled?
                        The creation form holds state internally.
                        Ideally we'd refactor ExitHeaderForm to accept 'initialData'.
                        For now, let's just display the data as read-only info if we don't refactor.
                        Or better, use the form if possible.
                        Checking useStockExits hook: createDraft is used to start.
                        Updates might not be implemented in hook yet? 
                        Let's check useStockExits again. It only has createDraft. No updateExit.
                        So header is likely fixed after creation for now.
                        Let's display values.
                    */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="font-semibold block">Tipo:</span>
                            {currentExit.type === 'SALE' ? 'Venda / Pedido' : currentExit.type}
                        </div>
                        <div>
                            <span className="font-semibold block">Destino:</span>
                            {currentExit.destinationType} - {currentExit.destinationName}
                        </div>
                        <div className="col-span-2">
                            <span className="font-semibold block">Observações:</span>
                            {currentExit.notes || '-'}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Itens da Saída</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <ExitItemsGrid
                        items={currentExit.items || []}
                        onAdd={(data) => addItem(currentExit.id, data)}
                        onRemove={(itemId) => removeItem(currentExit.id, itemId)}
                        isLoading={isLoading}
                        readOnly={currentExit.status !== 'DRAFT'}
                    />

                    {currentExit.status === 'DRAFT' && (
                        <div className="flex justify-end p-4 rounded-md">
                            <Button
                                size="lg"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={handleConfirm}
                                disabled={isLoading || !currentExit.items?.length}
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirmar Saída
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
