'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HeaderForm } from '../entradas/nova/components/header-form';
import { ItemsGrid } from '../entradas/nova/components/items-grid';
import { useStockEntries, CreateEntryData } from '@/hooks/useStockEntries';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { NFeItem } from '@/lib/nfe-parser';

interface NewStockEntryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function NewStockEntryDialog({ open, onOpenChange, onSuccess }: NewStockEntryDialogProps) {
    const { createDraft, currentEntry, addItem, removeItem, confirmEntry, error, isLoading } = useStockEntries();

    const [draftId, setDraftId] = useState<string | null>(null);
    const [draftData, setDraftData] = useState<CreateEntryData | null>(null);
    const [step, setStep] = useState(1);
    const [pendingItems, setPendingItems] = useState<NFeItem[]>([]);

    const handleCreateDraft = async (data: CreateEntryData) => {
        try {
            const entry = await createDraft(data);
            setDraftId(entry.id);
            setDraftData(data);
            setStep(2);
        } catch (err) {
            console.error(err);
        }
    };

    const handleConfirm = async () => {
        if (!draftId) return;
        try {
            await confirmEntry(draftId);
            onSuccess();
            handleClose();
        } catch (err) {
            console.error(err);
        }
    };

    const handleClose = () => {
        setDraftId(null);
        setDraftData(null);
        setStep(1);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[90vw] max-w-[90vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nova Entrada de Estoque</DialogTitle>
                    <DialogDescription>
                        {step === 1 ? 'Preencha os dados da nota fiscal.' : `Adicione itens à entrada ${draftData?.invoiceNumber || ''}`}
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="bg-destructive/15 text-destructive p-3 rounded-md flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {error}
                    </div>
                )}

                {step === 1 ? (
                    <HeaderForm
                        onSubmit={handleCreateDraft}
                        isLoading={isLoading}
                        onXmlImported={setPendingItems}
                    />
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-3 rounded-md border">
                            <div>
                                <span className="font-semibold text-muted-foreground">Fornecedor:</span> {draftData?.supplierName || '-'}
                            </div>
                            <div>
                                <span className="font-semibold text-muted-foreground">Nota Fiscal:</span> {draftData?.invoiceNumber || 'N/A'}
                            </div>
                        </div>

                        <ItemsGrid
                            items={currentEntry?.items || []}
                            onAdd={async (data) => { if (draftId) await addItem(draftId, data); }}
                            onRemove={async (itemId) => { if (draftId) await removeItem(draftId, itemId); }}
                            isLoading={isLoading}
                            pendingItems={pendingItems}
                            onResolvePending={(index) => {
                                const newPending = [...pendingItems];
                                newPending.splice(index, 1);
                                setPendingItems(newPending);
                            }}
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
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
