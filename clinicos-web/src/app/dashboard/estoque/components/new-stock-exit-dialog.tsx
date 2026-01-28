'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExitHeaderForm } from '../saidas/nova/components/exit-header-form';
import { ExitItemsGrid } from '../saidas/nova/components/exit-items-grid';
import { useStockExits, CreateExitData } from '@/hooks/useStockExits';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle } from 'lucide-react';

interface NewStockExitDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function NewStockExitDialog({ open, onOpenChange, onSuccess }: NewStockExitDialogProps) {
    const { createDraft, currentExit, addItem, removeItem, confirmExit, error, isLoading } = useStockExits();

    const [draftId, setDraftId] = useState<string | null>(null);
    const [draftData, setDraftData] = useState<CreateExitData | null>(null);
    const [step, setStep] = useState(1);

    const handleCreateDraft = async (data: CreateExitData) => {
        try {
            const exit = await createDraft(data);
            setDraftId(exit.id);
            setDraftData(data);
            setStep(2);
        } catch (err) {
            console.error(err);
        }
    };

    const handleConfirm = async () => {
        if (!draftId) return;
        try {
            await confirmExit(draftId);
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
                    <DialogTitle>Nova Saída de Estoque</DialogTitle>
                    <DialogDescription>
                        {step === 1 ? 'Identifique o destino e motivo da saída.' : `Adicione itens à saída para ${draftData?.destinationName || ''}`}
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="bg-destructive/15 text-destructive p-3 rounded-md flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {error}
                    </div>
                )}

                {step === 1 ? (
                    <ExitHeaderForm onSubmit={handleCreateDraft} isLoading={isLoading} />
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-3 rounded-md border">
                            <div>
                                <span className="font-semibold text-muted-foreground">Tipo:</span> {draftData?.type}
                            </div>
                            <div>
                                <span className="font-semibold text-muted-foreground">Destino:</span> {draftData?.destinationType} - {draftData?.destinationName}
                            </div>
                        </div>

                        <ExitItemsGrid
                            items={currentExit?.items || []}
                            onAdd={async (data) => { if (draftId) await addItem(draftId, data); }}
                            onRemove={async (itemId) => { if (draftId) await removeItem(draftId, itemId); }}
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
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
