'use client';

import { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FiscalTotalsForm } from '../nova/components/fiscal-totals-form';
import { ItemsGrid } from '../nova/components/items-grid';
import { useStockEntries } from '@/hooks/useStockEntries';
import { ArrowLeft, CheckCircle, AlertTriangle, Loader2, Upload, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { parseNFeXML, NFeItem } from '@/lib/nfe-parser';
import { InstallmentsList } from '../nova/components/installments-list';

// L8: datas "date-only" (chegada, emissão da NF) são gravadas como meia-noite UTC —
// formatar em UTC para não exibir o dia anterior no fuso local (BRT).
const formatDateOnly = (value?: string | Date | null) =>
    value ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-';

interface EditEntryPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default function EditEntryPage({ params }: EditEntryPageProps) {
    const { id } = use(params);
    const router = useRouter();
    const { currentEntry, getEntry, confirmEntry, updateEntry, addItem, updateItem, removeItem, deleteEntry, isLoading, error } = useStockEntries();
    const [isInitializing, setIsInitializing] = useState(true);
    const [showFiscalData, setShowFiscalData] = useState(false);
    const [pendingXmlItems, setPendingXmlItems] = useState<NFeItem[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Divergência com o Pedido de Compra
    const [showDivergenceModal, setShowDivergenceModal] = useState(false);
    const [divergences, setDivergences] = useState<string[]>([]);
    const [justification, setJustification] = useState('');
    const [supervisorEmail, setSupervisorEmail] = useState('');
    const [supervisorPassword, setSupervisorPassword] = useState('');
    const [modalError, setModalError] = useState('');

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

    const handleConfirm = async (forceConfirm = false) => {
        if (!id) return;
        setModalError('');
        try {
            await confirmEntry(id, {
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
                alert(err.response?.data?.message || 'Erro ao confirmar a entrada.');
                console.error(err);
            }
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        if (!confirm('Tem certeza que deseja excluir este rascunho de entrada? Esta ação não pode ser desfeita.')) return;

        try {
            await deleteEntry(id);
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

    const handleImportXml = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        if (currentEntry?.items && currentEntry.items.length > 0) {
            if (!confirm('Importar este XML irá substituir toda a lista de itens atual para que você possa fazer a conciliação. Deseja continuar?')) {
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }
        }

        try {
            const nfeData = await parseNFeXML(file);

            // Update Entry Header & Totals
            const updateData = {
                // Header
                invoiceNumber: nfeData.invoiceNumber,
                series: nfeData.series,
                accessKey: nfeData.accessKey,
                operationNature: nfeData.operationNature,
                protocol: nfeData.protocol,
                model: nfeData.model,
                emissionDate: nfeData.emissionDate ? nfeData.emissionDate.toISOString() : undefined,
                supplierName: nfeData.supplier.name, // Keep supplier from XML if possible, but ID remains from PO? 
                // Note: updating supplierName might be good, but supplierId might be needed. 
                // Ideally we keep the supplierId from PO. 

                // Totals
                calculationBaseICMS: Math.round(nfeData.totals.vBC * 100),
                valueICMS: Math.round(nfeData.totals.vICMS * 100),
                calculationBaseICMSST: Math.round(nfeData.totals.vBCST * 100),
                valueICMSST: Math.round(nfeData.totals.vST * 100),
                totalProductsValueCents: Math.round(nfeData.totals.vProd * 100),
                freightValueCents: Math.round(nfeData.totals.vFrete * 100),
                insuranceValueCents: Math.round(nfeData.totals.vSeg * 100),
                discountValueCents: Math.round(nfeData.totals.vDesc * 100),
                otherExpensesValueCents: Math.round(nfeData.totals.vOutro * 100),
                totalIPIValueCents: Math.round(nfeData.totals.vIPI * 100),

                // Transport
                freightType: nfeData.transport.modFrete,
                carrierName: nfeData.transport.carrierName,
                carrierDocument: nfeData.transport.carrierDocument,
                carrierState: nfeData.transport.carrierState,
                // carrierPlate not always in basic parser, check if needed

                // Volumes
                volumeQuantity: nfeData.transport.volQuantity,
                volumeSpecies: nfeData.transport.volSpecies,
                grossWeight: nfeData.transport.volGrossWeight,
                netWeight: nfeData.transport.volNetWeight,

                // Installments (Faturas / Duplicatas)
                installments: nfeData.installments && nfeData.installments.length > 0 ? nfeData.installments : undefined,
            };

            await updateEntry(id, updateData);

            // Remove existing items to allow clean reconciliation
            if (currentEntry?.items?.length) {
                // We need to remove them one by one or have a bulk remove endpoint. 
                // For now, parallel remove is fine for typically small POs.
                await Promise.all(currentEntry.items.map(item => removeItem(id, item.id)));
            }

            setPendingXmlItems(nfeData.items);
            await getEntry(id); // Reload to show new fiscal data

            alert('XML importado com sucesso! Utilize a lista de itens pendentes abaixo para conciliar com seus produtos.');

        } catch (err: any) {
            console.error(err);
            alert('Erro ao importar XML: ' + (err.message || 'Erro desconhecido'));
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
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
                    <h1 className="text-3xl font-bold tracking-tight">
                        {currentEntry.status === 'DRAFT' ? 'Continuar Entrada' : 'Detalhes da Entrada'}
                    </h1>
                    <p className="text-muted-foreground">
                        {currentEntry.status === 'DRAFT'
                            ? 'Edite os dados e adicione itens à entrada em rascunho.'
                            : 'Visualização completa da entrada de estoque confirmada.'}
                    </p>
                </div>
                {currentEntry.status === 'DRAFT' && (
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
                {currentEntry.status !== 'DRAFT' && (
                    <div className="ml-auto">
                        <Link href={`/dashboard/estoque/ocorrencias/nova?type=RECEBIMENTO&supplierId=${currentEntry.supplierId}`}>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                            >
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                Relatar Avaria
                            </Button>
                        </Link>
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
                            <span>Dados da Entrada</span>
                            <div className="text-sm font-normal text-muted-foreground flex items-center gap-2">
                                <span>ID: {currentEntry.id}</span>
                                <span className="bg-secondary px-2 py-0.5 rounded text-xs uppercase">{currentEntry.status === 'DRAFT' ? 'Rascunho' : currentEntry.status}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                accept=".xml"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleImportXml}
                            />
                            {currentEntry.status === 'DRAFT' && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isLoading}
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Importar XML da NF-e
                                </Button>
                            )}
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
                            {formatDateOnly(currentEntry.arrivalDate)}
                        </div>
                        <div>
                            <span className="font-semibold block">Fornecedor:</span>
                            {currentEntry.supplierName || '-'}
                        </div>
                        {currentEntry.emissionDate && (
                            <div>
                                <span className="font-semibold block">Emissão:</span>
                                {formatDateOnly(currentEntry.emissionDate)}
                            </div>
                        )}
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
                            entryId={currentEntry.id}
                            initialData={currentEntry}
                            onUpdate={handleUpdateEntry}
                            readOnly={currentEntry.status !== 'DRAFT'}
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
                        items={currentEntry.items || []}
                        onAdd={(data) => addItem(currentEntry.id, data)}
                        onRemove={(itemId) => removeItem(currentEntry.id, itemId)}
                        onUpdate={(itemId, data) => updateItem(currentEntry.id, itemId, data)}
                        isLoading={isLoading}
                        pendingItems={pendingXmlItems}
                        onResolvePending={(index) => {
                            setPendingXmlItems(prev => prev.filter((_, i) => i !== index));
                        }}
                        readOnly={currentEntry.status !== 'DRAFT'}
                    />

                    <div className="flex justify-between items-center bg-muted/20 p-4 rounded-md">
                        <div className="text-lg">
                            Total: <strong>
                                {currentEntry.totalValue ?
                                    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentEntry.totalValue)
                                    : 'R$ 0,00'}
                            </strong>
                        </div>
                        {currentEntry.status === 'DRAFT' && (
                            <Button
                                size="lg"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleConfirm()}
                                disabled={isLoading || !currentEntry.items?.length}
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirmar Entrada
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Modal de Divergência com o Pedido de Compra */}
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
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
        </div>
    );
}
