'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExitHeaderForm } from './components/exit-header-form';
import { ExitItemsGrid } from './components/exit-items-grid';
import { useStockExits, CreateExitData } from '@/hooks/useStockExits';
import { ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function NewExitPage() {
    const router = useRouter();
    const { createDraft, currentExit, addItem, removeItem, confirmExit, error, isLoading } = useStockExits();

    const [draftId, setDraftId] = useState<string | null>(null);
    const [draftData, setDraftData] = useState<CreateExitData | null>(null);

    const handleCreateDraft = async (data: CreateExitData) => {
        try {
            const exit = await createDraft(data);
            setDraftId(exit.id);
            setDraftData(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleConfirm = async () => {
        if (!draftId) return;
        try {
            await confirmExit(draftId);
            router.push('/dashboard/estoque/movimentacoes');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/estoque/movimentacoes">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Nova Saída de Estoque</h1>
                    <p className="text-muted-foreground">
                        Registre requisições, perdas ou ajustes de estoque.
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-destructive/15 text-destructive p-3 rounded-md flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {error}
                </div>
            )}

            {!draftId ? (
                <Card>
                    <CardHeader>
                        <CardTitle>1. Dados da Saída</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ExitHeaderForm onSubmit={handleCreateDraft} isLoading={isLoading} />
                    </CardContent>
                </Card>
            ) : (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>Resumo da Saída</span>
                                <span className="text-sm font-normal text-muted-foreground">ID: {draftId}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="font-semibold block">Tipo:</span>
                                    {draftData?.type}
                                </div>
                                <div>
                                    <span className="font-semibold block">Destino:</span>
                                    {draftData?.destinationType} - {draftData?.destinationName}
                                </div>
                                <div className="col-span-2">
                                    <span className="font-semibold block">Observações:</span>
                                    {draftData?.notes || '-'}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>2. Itens da Saída</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <ExitItemsGrid
                                items={currentExit?.items || []}
                                onAdd={(data) => addItem(draftId, data)}
                                onRemove={(itemId) => removeItem(draftId, itemId)}
                                isLoading={isLoading}
                            />

                            <div className="flex justify-end bg-muted/20 p-4 rounded-md">
                                <Button
                                    size="lg"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={handleConfirm}
                                    disabled={isLoading || !currentExit?.items?.length}
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Confirmar Saída
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
