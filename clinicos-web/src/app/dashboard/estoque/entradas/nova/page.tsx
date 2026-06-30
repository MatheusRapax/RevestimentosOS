'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { HeaderForm } from './components/header-form';
import { FiscalTotalsForm } from './components/fiscal-totals-form';
import { ItemsGrid } from './components/items-grid';
import { useStockEntries, CreateEntryData } from '@/hooks/useStockEntries';
import { ArrowLeft, CheckCircle, AlertTriangle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { NFeItem } from '@/lib/nfe-parser';
import { InstallmentsList } from './components/installments-list';
import Link from 'next/link';
import api from '@/lib/api';
import { useEffect } from 'react';

export default function NewEntryPage() {
    const router = useRouter();
    const { createDraft, getEntry, currentEntry, addItem, removeItem, updateItem, updateEntry, confirmEntry, deleteEntry, error, isLoading } = useStockEntries();

    // Local state for the draft logic if needed, but hook handles currentEntry mostly? 
    // Wait, useStockEntries hook manages 'currentEntry' via getEntry.
    // createDraft returns the entry. I should start using it.

    const [draftId, setDraftId] = useState<string | null>(null);
    const [draftData, setDraftData] = useState<CreateEntryData | null>(null);
    const [showFiscalData, setShowFiscalData] = useState(false);
    const [pendingXmlItems, setPendingXmlItems] = useState<NFeItem[]>([]);
    const [updateMasterData, setUpdateMasterData] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showDivergenceModal, setShowDivergenceModal] = useState(false);
    const [divergences, setDivergences] = useState<string[]>([]);
    const [justification, setJustification] = useState('');
    const [supervisorEmail, setSupervisorEmail] = useState('');
    const [supervisorPassword, setSupervisorPassword] = useState('');
    const [modalError, setModalError] = useState('');
    const [availablePOs, setAvailablePOs] = useState<any[]>([]);

    useEffect(() => {
        if (draftData?.supplierId) {
            api.get('/purchase-orders', {
                params: {
                    supplierId: draftData.supplierId,
                    status: 'SENT,CONFIRMED,PARTIAL' // Database ENUMs
                }
            }).then(res => {
                const open = res.data.filter((po: any) => ['SENT', 'CONFIRMED', 'PARTIAL'].includes(po.status));
                setAvailablePOs(open);
            }).catch(err => console.error("Failed to fetch POs for supplier", err));
        } else {
            setAvailablePOs([]);
        }
    }, [draftData?.supplierId]);

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

    const handleConfirm = async (forceConfirm = false) => {
        if (!draftId) return;
        setModalError('');
        try {
            await confirmEntry(draftId, {
                updateMasterData,
                forceConfirm,
                justification: forceConfirm ? justification : undefined,
                supervisorEmail: forceConfirm ? supervisorEmail : undefined,
                supervisorPassword: forceConfirm ? supervisorPassword : undefined,
            });
            setShowDivergenceModal(false);
            router.push('/dashboard/estoque/movimentacoes');
        } catch (err: any) {
            const code = err.response?.data?.code;
            const status = err.response?.status;
            
            if (code === 'PRICE_DIVERGENCE' || code === 'PO_DIVERGENCE') {
                setDivergences(err.response.data.divergences || []);
                setShowDivergenceModal(true);
            } else if (status === 401 || status === 403) {
                setModalError(err.response?.data?.message || 'Acesso negado');
            } else {
                console.error(err);
            }
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

        try {
            await deleteEntry(draftId);
            setDraftId(null);
            setDraftData(null);
            setPendingXmlItems([]);
            setShowDeleteConfirm(false);
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
                                        onClick={() => setShowDeleteConfirm(true)}
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
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setShowFiscalData(!showFiscalData)}>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">Dados Fiscais (Opcional)</CardTitle>
                                <Button variant="ghost" size="sm">
                                    {showFiscalData ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                                    {showFiscalData ? 'Ocultar' : 'Mostrar'}
                                </Button>
                            </div>
                        </CardHeader>
                        {showFiscalData && (
                            <CardContent>
                                <FiscalTotalsForm
                                    entryId={draftId}
                                    initialData={currentEntry}
                                    onUpdate={handleUpdateEntry}
                                />
                            </CardContent>
                        )}
                    </Card>

                    {/* Faturas / Duplicatas */}
                    {currentEntry?.installmentsData && Array.isArray(currentEntry.installmentsData) && currentEntry.installmentsData.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Faturas / Duplicatas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <InstallmentsList installments={currentEntry.installmentsData} />
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>2. Itens da Entrada</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <ItemsGrid
                                items={currentEntry?.items || []}
                                onAdd={(data) => addItem(draftId, data)}
                                onRemove={(itemId) => removeItem(draftId, itemId)}
                                onUpdate={(itemId, data) => updateItem(draftId, itemId, data)}
                                isLoading={isLoading}
                                pendingItems={pendingXmlItems}
                                onResolvePending={handleResolvePending}
                                availablePOs={availablePOs}
                            />

                            <div className="flex justify-between items-center bg-muted/20 p-4 rounded-md">
                                <div className="space-y-4">
                                    <div className="text-lg">
                                        Total: <strong>
                                            {currentEntry?.totalValue ?
                                                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentEntry.totalValue)
                                                : 'R$ 0,00'}
                                        </strong>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="updateMasterData"
                                            checked={updateMasterData}
                                            onCheckedChange={(checked) => setUpdateMasterData(!!checked)}
                                        />
                                        <label
                                            htmlFor="updateMasterData"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            Atualizar dados fiscais (NCM, CEST, CFOP) dos produtos com os dados da Nota
                                        </label>
                                    </div>
                                </div>
                                <Button
                                    size="lg"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleConfirm(false)}
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

            {/* Modal de Divergência */}
            <Dialog open={showDivergenceModal} onOpenChange={setShowDivergenceModal}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Divergência Detectada (Preço / Quantidade)
                        </DialogTitle>
                        <DialogDescription>
                            Foram encontradas divergências entre esta Nota Fiscal e o Pedido de Compra original. 
                            Uma justificativa gerencial é obrigatória para autorizar a entrada no estoque.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                        <div className="bg-muted p-3 rounded-md text-sm space-y-2 max-h-[200px] overflow-y-auto">
                            {divergences.map((div, i) => (
                                <div key={i} className="text-destructive font-medium">{div}</div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="justification">Justificativa da Aprovação</Label>
                            <Textarea 
                                id="justification" 
                                placeholder="Explique o motivo da divergência para aprovar..."
                                value={justification}
                                onChange={(e) => setJustification(e.target.value)}
                            />
                        </div>

                        <div className="pt-2 border-t space-y-4">
                            <p className="text-xs text-muted-foreground">
                                Se você não for Gerente ou Administrador, solicite a liberação de um supervisor abaixo:
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="supervisorEmail">E-mail do Supervisor</Label>
                                    <input
                                        id="supervisorEmail"
                                        type="email"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="admin@loja.com"
                                        value={supervisorEmail}
                                        onChange={(e) => setSupervisorEmail(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="supervisorPassword">Senha do Supervisor</Label>
                                    <input
                                        id="supervisorPassword"
                                        type="password"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={supervisorPassword}
                                        onChange={(e) => setSupervisorPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {modalError && (
                            <div className="bg-destructive/15 text-destructive p-3 rounded-md flex items-center gap-2 text-sm font-medium">
                                <AlertTriangle className="h-4 w-4" />
                                {modalError}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDivergenceModal(false)}>Cancelar</Button>
                        <Button 
                            variant="destructive" 
                            onClick={() => handleConfirm(true)}
                            disabled={isLoading || justification.trim().length < 5}
                        >
                            Aprovar Divergência
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Confirmação de Exclusão */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente o rascunho 
                            da entrada de estoque e os vínculos dos itens.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDeleteDraft}
                            disabled={isLoading}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            Sim, excluir rascunho
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
