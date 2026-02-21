'use client';

import { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FiscalTotalsForm } from '../nova/components/fiscal-totals-form';
import { ItemsGrid } from '../nova/components/items-grid';
import { useStockEntries } from '@/hooks/useStockEntries';
import { ArrowLeft, CheckCircle, AlertTriangle, Loader2, Upload, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseNFeXML, NFeItem } from '@/lib/nfe-parser';

interface EditEntryPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default function EditEntryPage({ params }: EditEntryPageProps) {
    const { id } = use(params);
    const router = useRouter();
    const { getEntry, currentEntry, addItem, removeItem, updateEntry, confirmEntry, deleteEntry, error, isLoading } = useStockEntries();
    const [isInitializing, setIsInitializing] = useState(true);
    const [pendingXmlItems, setPendingXmlItems] = useState<NFeItem[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                        readOnly={currentEntry.status !== 'DRAFT'}
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
                                onClick={handleConfirm}
                                disabled={isLoading || !currentEntry.items?.length}
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Confirmar Entrada
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
