'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HeaderForm } from './components/header-form';
import { FiscalTotalsForm } from './components/fiscal-totals-form';
import { ItemsGrid } from './components/items-grid';
import { useStockEntries, CreateEntryData } from '@/hooks/useStockEntries';
import { ArrowLeft, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { NFeItem } from '@/lib/nfe-parser';
import Link from 'next/link';

export default function NewEntryPage() {
    const router = useRouter();
    const { createDraft, getEntry, currentEntry, addItem, removeItem, updateEntry, confirmEntry, deleteEntry, error, isLoading } = useStockEntries();

    // Local state for the draft logic if needed, but hook handles currentEntry mostly? 
    // Wait, useStockEntries hook manages 'currentEntry' via getEntry.
    // createDraft returns the entry. I should start using it.

    const [draftId, setDraftId] = useState<string | null>(null);
    const [draftData, setDraftData] = useState<CreateEntryData | null>(null);
    const [pendingXmlItems, setPendingXmlItems] = useState<NFeItem[]>([]);

    const handleCreateDraft = async (data: CreateEntryData) => {
        try {
            const entry = await createDraft(data);
            setDraftId(entry.id);
            setDraftData(data);
            await getEntry(entry.id);
        } catch (err) {
            console.error(err);
        }
    };

    const handleConfirm = async () => {
        if (!draftId) return;
        try {
            await confirmEntry(draftId);
            router.push('/dashboard/estoque/movimentacoes');
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateEntry = async (data: any) => {
        if (!draftId) return;
        try {
            await updateEntry(draftId, data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleResolvePending = (index: number) => {
        setPendingXmlItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleDeleteDraft = async () => {
        if (!draftId) return;
        if (!confirm('Tem certeza que deseja excluir este rascunho? Esta ação não pode ser desfeita.')) return;

        try {
            await deleteEntry(draftId);
            setDraftId(null);
            setDraftData(null);
            setPendingXmlItems([]);
        } catch (err) {
            console.error(err);
        }
    };

    // Derived state for HeaderForm: if draft exists, it's view-only? 
    // For now, let's keep it simple: Once created, header is fixed.

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/estoque/movimentacoes">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Nova Entrada de Estoque</h1>
                    <p className="text-muted-foreground">
                        Preencha os dados da nota fiscal e adicione os itens.
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
                        <CardTitle>1. Dados da Nota</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <HeaderForm
                            onSubmit={handleCreateDraft}
                            isLoading={isLoading}
                            onXmlImported={setPendingXmlItems}
                        />
                    </CardContent>
                </Card>
            ) : (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                <span>Dados da Entrada</span>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-normal text-muted-foreground">ID: {draftId}</span>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={handleDeleteDraft}
                                        disabled={isLoading}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Excluir Rascunho
                                    </Button>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="font-semibold block">Tipo:</span>
                                    {draftData?.type}
                                </div>
                                <div>
                                    <span className="font-semibold block">Nota Fiscal:</span>
                                    {draftData?.invoiceNumber} - Série {draftData?.series}
                                </div>
                                <div>
                                    <span className="font-semibold block">Fornecedor:</span>
                                    {draftData?.supplierName}
                                </div>
                                <div>
                                    <span className="font-semibold block">Emissão:</span>
                                    {draftData?.emissionDate}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Completar Dados Fiscais</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FiscalTotalsForm
                                entryId={draftId}
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
                                items={currentEntry?.items || []}
                                onAdd={(data) => addItem(draftId, data)}
                                onRemove={(itemId) => removeItem(draftId, itemId)}
                                isLoading={isLoading}
                                pendingItems={pendingXmlItems}
                                onResolvePending={handleResolvePending}
                            />

                            <div className="flex justify-between items-center bg-muted/20 p-4 rounded-md">
                                <div className="text-lg">
                                    Total: <strong>
                                        {currentEntry?.totalValue ?
                                            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentEntry.totalValue)
                                            : 'R$ 0,00'}
                                    </strong>
                                </div>
                                <Button
                                    size="lg"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={handleConfirm}
                                    disabled={isLoading || !currentEntry?.items?.length}
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Confirmar Entrada
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
