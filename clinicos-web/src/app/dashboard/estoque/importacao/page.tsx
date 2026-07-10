'use client';

import { useState, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { 
    UploadCloud, 
    FileSpreadsheet, 
    Trash2, 
    AlertTriangle, 
    Sparkles, 
    Info,
    Save,
    Download,
    X,
    Check,
    FileDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Badge } from '../../../../components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../../../../components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from '../../../../components/ui/dialog';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '../../../../components/ui/sheet';

import api from '../../../../lib/api';
import { toast } from 'sonner';
import { AuthContext } from '../../../../contexts/auth-context';

const STRATEGY = 'STANDARD';

export default function ImportProductsPage() {
    const { activeClinic } = useContext(AuthContext);
    const queryClient = useQueryClient();

    const [isAnomalyDrawerOpen, setIsAnomalyDrawerOpen] = useState(false);
    const [processedSheets, setProcessedSheets] = useState<string[]>([]);

    const [file, setFile] = useState<File | null>(null);
    const [supplierId, setSupplierId] = useState<string>('');
    const [brandName, setBrandName] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [importMode, setImportMode] = useState<'STANDARD' | 'AI'>('STANDARD');
    const [step, setStep] = useState<'upload' | 'select_sheet' | 'resolve_ambiguities' | 'preview'>('upload');
    const [parsedItems, setParsedItems] = useState<any[]>([]);
    const [invalidTemplateError, setInvalidTemplateError] = useState<string | null>(null);
    const [showPreConfirmation, setShowPreConfirmation] = useState(false);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Estados de Seleção de Aba
    const [availableSheets, setAvailableSheets] = useState<string[]>([]);
    const [selectedSheet, setSelectedSheet] = useState<string>('');

    // Estados de Ambiguidade
    const [ambiguityHeaders, setAmbiguityHeaders] = useState<string[]>([]);
    const [ambiguitySampleData, setAmbiguitySampleData] = useState<any[]>([]);
    const [ambiguitiesList, setAmbiguitiesList] = useState<string[]>([]);
    const [mappingState, setMappingState] = useState<any>(null);
    const [selectedCostColumn, setSelectedCostColumn] = useState<string>('');

    const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
    const [newBrandInput, setNewBrandInput] = useState('');
    const [brandDuplicateError, setBrandDuplicateError] = useState<string | null>(null);

    // Fetch Suppliers
    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers'],
        queryFn: async () => {
            const res = await api.get('/suppliers');
            return res.data;
        }
    });

    // Fetch Brands
    const { data: brands = [] } = useQuery({
        queryKey: ['brands', activeClinic],
        queryFn: async () => {
            const res = await api.get('/catalogue/brands', { params: { clinicId: activeClinic } });
            return res.data;
        },
        enabled: !!activeClinic
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const res = await api.get('/stock/products/import/template', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = 'Template_Importacao_Produtos.xlsx';
            link.click();
            window.URL.revokeObjectURL(url);
        } catch {
            toast.error('Não foi possível baixar o template.');
        }
    };

    const handleParse = async () => {
        if (!file || !supplierId || !brandName) {
            toast.error('Selecione um arquivo, um fornecedor e uma marca.');
            return;
        }

        setIsLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            let response;
            if (importMode === 'STANDARD') {
                response = await api.post(
                    `/stock/products/import/parse?strategy=${STRATEGY}&clinicId=${activeClinic || ''}`,
                    formData,
                    { headers: { 'Content-Type': 'multipart/form-data' } }
                );
            } else {
                const extractRes = await api.post('/stock/products/import/extract-sheets', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                const sheets = extractRes.data.sheets;
                
                if (sheets && sheets.length > 1) {
                    setAvailableSheets(sheets);
                    setSelectedSheet(sheets[0]);
                    setStep('select_sheet');
                    setIsLoading(false);
                    return;
                }
                
                // Se só tem 1 aba, vai direto
                const target = sheets && sheets.length === 1 ? sheets[0] : undefined;
                await processAIMap(formData, target);
                return;
            }

            setParsedItems(response.data.items);
            setStep('preview');
            toast.success('Arquivo processado! Verifique os dados abaixo.');
        } catch (error: any) {
            console.error(error);
            const errData = error.response?.data;
            if (errData?.code === 'INVALID_TEMPLATE') {
                setInvalidTemplateError(errData.message);
            } else {
                toast.error(errData?.message || 'Falha ao processar arquivo.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const processAIMap = async (formData: FormData, targetSheetName?: string) => {
        try {
            const url = `/stock/products/import/ai-map?supplierId=${supplierId}&clinicId=${activeClinic || ''}${targetSheetName ? `&targetSheetName=${encodeURIComponent(targetSheetName)}` : ''}`;
            const response = await api.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            
            if (response.data.ambiguities && response.data.ambiguities.length > 0) {
                setAmbiguitiesList(response.data.ambiguities);
                setAmbiguityHeaders(response.data.headers || []);
                setAmbiguitySampleData(response.data.sampleData || []);
                setMappingState(response.data.mapping);
                setStep('resolve_ambiguities');
                setIsLoading(false);
                return;
            }
            
            const itemsWithOriginalSku = response.data.items.map((i: any) => ({ ...i, originalSku: i.sku }));
            setParsedItems(itemsWithOriginalSku);
            setStep('preview');
            toast.success('Arquivo processado! Verifique os dados abaixo.');
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Falha ao mapear planilha com IA.');
            setIsLoading(false);
        }
    };

    const handleConfirmSheetSelection = async () => {
        setIsLoading(true);
        const formData = new FormData();
        formData.append('file', file!);
        await processAIMap(formData, selectedSheet);
    };

    const handleResolveAmbiguities = async () => {
        if (!selectedCostColumn) {
            toast.error('Selecione uma coluna para Custo.');
            return;
        }
        
        const newMapping = { ...mappingState };
        newMapping.cost = selectedCostColumn;
        
        setIsLoading(true);
        const formData = new FormData();
        formData.append('file', file!);
        formData.append('forceMapping', JSON.stringify(newMapping));
        
        try {
            const url = `/stock/products/import/ai-map?supplierId=${supplierId}&clinicId=${activeClinic || ''}${selectedSheet ? `&targetSheetName=${encodeURIComponent(selectedSheet)}` : ''}`;
            const response = await api.post(
                url,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            
            const itemsWithOriginalSku = response.data.items.map((i: any) => ({ ...i, originalSku: i.sku }));
            setParsedItems(itemsWithOriginalSku);
            setStep('preview');
            toast.success('Ambiguidade resolvida! Verifique o preview.');
        } catch (error: any) {
            console.error(error);
            toast.error('Erro ao processar arquivo com novo mapeamento.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApproveItem = (idx: number) => {
        const item = parsedItems[idx];
        const isDuplicateNow = parsedItems.filter(i => i.sku === item.sku).length > 1;
        
        if (item.anomalies?.some((a: any) => a.type === 'DUPLICATE_SKU' || a === 'DUPLICATE_SKU') && isDuplicateNow) {
            toast.error('Este SKU ainda está duplicado na lista. Altere o SKU de um dos itens conflitantes para um código único.');
            return;
        }

        const newItems = [...parsedItems];
        newItems[idx].confidence = 'HIGH';
        newItems[idx].anomalies = [];
        setParsedItems(newItems);
        toast.success(`Item "${newItems[idx].sku || 'Sem SKU'}" aprovado com sucesso.`);
    };

    const handleDeleteItem = (idx: number) => {
        const newItems = [...parsedItems];
        newItems.splice(idx, 1);
        setParsedItems(newItems);
        toast.success('Item removido.');
    };

    const handleExecuteClick = () => {
        setShowPreConfirmation(true);
    };

    const executeImport = async () => {
        setShowPreConfirmation(false);
        setIsLoading(true);
        try {
            const payload = {
                supplierId,
                clinicId: activeClinic,
                strategy: STRATEGY,
                brandName: brandName.trim() || undefined,
                items: parsedItems.map((item) => {
                    const { 
                        isNew, brand, ean, ncm, cest, confidence, anomalies, 
                        cost, costPerM2, originalSku, oldCostCents, oldCostPerM2Cents,
                        ...rest 
                    } = item as any;
                    return rest;
                }),
            };
            await api.post('/stock/products/import/execute', payload);
            toast.success(`Importação da aba realizada com sucesso! ${parsedItems.length} produtos salvos.`);
            if (availableSheets.length > 1) {
                setProcessedSheets(prev => [...prev, selectedSheet]);
                setParsedItems([]);
                setSelectedSheet('');
                setStep('select_sheet');
            } else {
                setFile(null);
                setParsedItems([]);
                setProcessedSheets([]);
                setStep('upload');
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Falha ao salvar produtos.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmNewBrand = () => {
        const trimmed = newBrandInput.trim();
        if (!trimmed) return;

        // Case-insensitive duplicate check against loaded brands
        const duplicate = brands.find(
            (b: any) => b.name.toLowerCase() === trimmed.toLowerCase()
        );

        if (duplicate) {
            setBrandDuplicateError(`A marca "${duplicate.name}" já está cadastrada. Selecione-a na lista.`);
            return;
        }

        setBrandName(trimmed);
        setIsBrandModalOpen(false);
        setNewBrandInput('');
        setBrandDuplicateError(null);
        // Refresh brands list so the new brand appears after import creates it
        queryClient.invalidateQueries({ queryKey: ['brands', activeClinic] });
    };

    const updateItem = (idx: number, field: string, value: any) => {
        const newItems = [...parsedItems];
        newItems[idx] = { ...newItems[idx], [field]: value };
        // Recalculate costCents when costPerM2 or boxCoverage changes
        if ((field === 'costPerM2Cents' || field === 'boxCoverage') && newItems[idx].unit === 'M2') {
            const coverage = newItems[idx].boxCoverage || 0;
            const m2Cost = newItems[idx].costPerM2Cents || 0;
            if (coverage > 0 && m2Cost > 0) {
                newItems[idx].costCents = Math.round((m2Cost / 100) * coverage * 100);
            }
        }
        setParsedItems(newItems);
    };

    const isM2 = (item: any) => item.unit === 'M2';

    const handleExportPreview = () => {
        if (!parsedItems || parsedItems.length === 0) return;
        
        const exportData = parsedItems.map(item => ({
            SKU: item.sku,
            Status: item.isNew ? 'Novo' : 'Atualização',
            Confianca: item.confidence === 'HIGH' ? 'Alta' : item.confidence === 'MEDIUM' ? 'Média' : item.confidence === 'LOW' ? 'Baixa' : '',
            Unidade: item.unit,
            Nome: item.name,
            Formato: item.format,
            Linha: item.line,
            Uso: item.usage,
            Cor: item.color,
            Altura: item.height,
            Largura: item.width,
            Profundidade: item.depth,
            PecasPorCaixa: item.piecesPerBox,
            M2PorCaixa: item.boxCoverage,
            CaixasPorPallet: item.palletBoxes,
            PesoPorCaixa: item.boxWeight,
            CustoPorM2: item.costPerM2Cents != null ? item.costPerM2Cents / 100 : '',
            CustoPorCaixa_Ou_Unidade: item.costCents / 100,
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Preview Importação');
        XLSX.writeFile(workbook, `preview_importacao_${brandName}_${new Date().getTime()}.xlsx`);
    };

    return (
        <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight">Importação de Produtos</h1>

                    <div className="flex bg-muted/30 p-1 rounded-lg border">
                        <button
                            onClick={() => setImportMode('STANDARD')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${importMode === 'STANDARD' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}
                        >
                            Template Padrão
                        </button>
                        <button
                            onClick={() => setImportMode('AI')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${importMode === 'AI' ? 'bg-amber-50 shadow text-amber-900 border border-amber-200' : 'text-muted-foreground hover:bg-muted/50'}`}
                        >
                            <Sparkles className="h-4 w-4 text-amber-500" />
                            IA Automática
                        </button>
                    </div>
                </div>

                {step === 'upload' && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle>Configuração da Importação</CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {importMode === 'STANDARD' ? (
                                            <>Use o <strong>Template Padrão</strong> do sistema. Suporta produtos por M² e por unidade na mesma planilha.</>
                                        ) : (
                                            <>Importação assistida por IA. Faça o upload da planilha <strong>original do fornecedor</strong>. Nós cuidamos do mapeamento.</>
                                        )}
                                    </p>
                                </div>
                                {importMode === 'STANDARD' && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex items-center gap-2 shrink-0"
                                        onClick={handleDownloadTemplate}
                                    >
                                        <Download className="h-4 w-4" />
                                        Baixar Template Padrão
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Supplier */}
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label>Fornecedor</Label>
                                <Select onValueChange={setSupplierId} value={supplierId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o fornecedor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map((s: any) => (
                                            <SelectItem key={s.id} value={s.id}>{s.tradingName || s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Brand */}
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label>Marca / Fabricante <span className="text-red-500">*</span></Label>
                                <div className="flex gap-2">
                                    <Select onValueChange={setBrandName} value={brandName || undefined}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Selecione a marca" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {brands.map((b: any) => (
                                                <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                                            ))}
                                            {brands.length === 0 && (
                                                <SelectItem value="none" disabled>Nenhuma marca encontrada</SelectItem>
                                            )}
                                            {brandName && !brands.some((b: any) => b.name === brandName) && (
                                                <SelectItem value={brandName}>{brandName} (Nova)</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>

                                    <Dialog open={isBrandModalOpen} onOpenChange={(open) => {
                                        setIsBrandModalOpen(open);
                                        if (!open) {
                                            setNewBrandInput('');
                                            setBrandDuplicateError(null);
                                        }
                                    }}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" title="Adicionar nova marca">+</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Adicionar Nova Marca</DialogTitle>
                                            </DialogHeader>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid gap-2">
                                                    <Label>Nome da Marca</Label>
                                                    <Input
                                                        placeholder="Digite o nome da marca..."
                                                        value={newBrandInput}
                                                        onChange={(e) => {
                                                            setNewBrandInput(e.target.value);
                                                            setBrandDuplicateError(null);
                                                        }}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleConfirmNewBrand()}
                                                    />
                                                    {brandDuplicateError && (
                                                        <p className="text-sm text-red-500">{brandDuplicateError}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setIsBrandModalOpen(false)}>Cancelar</Button>
                                                <Button onClick={handleConfirmNewBrand}>Confirmar</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Será aplicada a <strong>todos</strong> os produtos desta importação.
                                </p>
                            </div>

                            {/* File */}
                            <div className="grid w-full items-center gap-1.5">
                                <Label>Arquivo Excel (.xlsx)</Label>
                                <div 
                                  className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${file ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:bg-muted/50'}`}
                                >
                                    <input 
                                        key={file ? file.name : 'empty'}
                                        type="file" 
                                        accept=".xlsx,.xls,.csv" 
                                        onChange={handleFileChange} 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    {file ? (
                                        <div className="flex flex-col items-center justify-center space-y-2 text-center pointer-events-none">
                                            <div className="p-2 bg-primary/10 text-primary rounded-full">
                                                <FileSpreadsheet className="w-8 h-8" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-semibold text-primary">{file.name}</p>
                                                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB anexado</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center space-y-2 text-center pointer-events-none">
                                            <div className="p-2 bg-muted text-muted-foreground rounded-full">
                                                <UploadCloud className="w-8 h-8" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium">Clique ou arraste um arquivo para anexar</p>
                                                <p className="text-xs text-muted-foreground">.xlsx, .xls, ou .csv (Máx. 10MB)</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {file && (
                                    <div className="flex justify-end mt-1">
                                        <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-auto py-1" onClick={() => setFile(null)}>
                                            <X className="w-3 h-3 mr-1" /> Remover Arquivo
                                        </Button>
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                    {importMode === 'STANDARD' ? 'Utilize o template padrão do sistema. A coluna "Unidade de Medida" define o tipo: M2, UN, CX, ML ou PC.' : 'Faça o upload da planilha original do fornecedor.'}
                                </p>
                            </div>

                            <Button
                                onClick={handleParse}
                                disabled={isLoading || !file || !supplierId || !brandName}
                            >
                                {isLoading ? 'Lendo Arquivo...' : 'Pré-visualizar Importação'}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {step === 'select_sheet' && (
                    <Card className="border-blue-500 shadow-md">
                        <CardHeader className="bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-900">
                            <CardTitle className="text-blue-700 dark:text-blue-500 flex items-center">
                                <FileSpreadsheet className="w-5 h-5 mr-2" /> 
                                Múltiplas Abas Detectadas
                            </CardTitle>
                            <p className="text-sm text-blue-800 dark:text-blue-400/80">
                                As planilhas complexas são importadas uma aba por vez para garantir a precisão da IA. Selecione a primeira aba para processar. As demais poderão ser processadas posteriormente repetindo o fluxo.
                            </p>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="flex flex-col gap-3">
                                {availableSheets.map((sheet, idx) => {
                                    const isProcessed = processedSheets.includes(sheet);
                                    return (
                                    <Label 
                                        key={idx} 
                                        className={`flex items-center space-x-3 p-3 border rounded-md transition-colors ${selectedSheet === sheet ? 'border-primary bg-primary/5 ring-1 ring-primary' : isProcessed ? 'bg-slate-50 dark:bg-slate-900/50 opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'}`}
                                    >
                                        <input 
                                            type="radio" 
                                            name="sheetName" 
                                            value={sheet} 
                                            checked={selectedSheet === sheet} 
                                            onChange={(e) => !isProcessed && setSelectedSheet(e.target.value)} 
                                            disabled={isProcessed}
                                            className="w-4 h-4 text-primary accent-primary"
                                        />
                                        <div className="flex flex-col">
                                            <span className="font-medium text-base flex items-center">
                                                {sheet} 
                                                {isProcessed && <span className="text-xs text-green-600 dark:text-green-500 ml-2 font-semibold flex items-center"><Check className="w-3 h-3 mr-1" /> Importada</span>}
                                            </span>
                                        </div>
                                    </Label>
                                )})}
                            </div>
                            
                            <div className="flex gap-2 justify-end mt-6">
                                {processedSheets.length > 0 && (
                                    <Button variant="outline" className="mr-auto border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => {
                                        setFile(null);
                                        setProcessedSheets([]);
                                        setStep('upload');
                                    }}>
                                        Encerrar Importação
                                    </Button>
                                )}
                                <Button variant="outline" onClick={() => {
                                    setStep('upload');
                                    setFile(null);
                                    setProcessedSheets([]);
                                }}>
                                    Cancelar
                                </Button>
                                <Button 
                                    onClick={handleConfirmSheetSelection} 
                                    disabled={!selectedSheet || isLoading || processedSheets.includes(selectedSheet)}
                                >
                                    {isLoading ? 'Processando...' : 'Continuar com esta Aba'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {step === 'resolve_ambiguities' && (
                    <Card className="border-amber-500 shadow-md">
                        <CardHeader className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900">
                            <CardTitle className="text-amber-700 dark:text-amber-500 flex items-center">
                                <Sparkles className="w-5 h-5 mr-2" /> 
                                Ação Necessária: Ambiguidades Encontradas
                            </CardTitle>
                            <p className="text-sm text-amber-800 dark:text-amber-400/80">
                                A inteligência artificial encontrou múltiplas colunas possíveis para um ou mais campos obrigatórios. Por favor, confirme as opções abaixo antes de gerar o preview.
                            </p>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {ambiguitiesList.map((ambiguity: any, idx: number) => {
                                const isCostAmbiguity = ambiguity.type === 'MULTIPLE_PRICES';
                                return (
                                    <div key={idx} className="mb-6 p-4 border rounded-md bg-slate-50 dark:bg-slate-900">
                                        <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-200">
                                            ❓ {ambiguity.message || 'Encontramos um conflito nas colunas.'}
                                        </h3>
                                        {isCostAmbiguity && ambiguity.options && ambiguity.options.length > 0 && (
                                            <div className="flex flex-col gap-3">
                                                {ambiguity.options
                                                    .filter((opt: any, index: number, self: any[]) => 
                                                        index === self.findIndex((t) => t.column === opt.column)
                                                    )
                                                    .map((opt: any, optIdx: number) => {
                                                    const header = opt.column;
                                                    // Fallback to option's sampleValue if ambiguitySampleData doesn't have it
                                                    const sampleRow = ambiguitySampleData.find(row => 
                                                        row[header] !== undefined && 
                                                        row[header] !== null && 
                                                        String(row[header]).trim() !== '' &&
                                                        String(row[header]).trim() !== String(header).trim()
                                                    );
                                                    const sampleValue = sampleRow ? sampleRow[header] : (opt.sampleValue || 'N/A');
                                                    
                                                    // Evitar erro de key vazia se o header for vazio ou duplicado
                                                    const safeKey = header ? `${header}-${optIdx}` : `empty-header-${optIdx}`;

                                                    return (
                                                        <Label 
                                                            key={safeKey} 
                                                            className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer transition-colors ${selectedCostColumn === header ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                                        >
                                                            <input 
                                                                type="radio" 
                                                                name="costColumn" 
                                                                value={header} 
                                                                checked={selectedCostColumn === header} 
                                                                onChange={(e) => setSelectedCostColumn(e.target.value)} 
                                                                className="w-4 h-4 text-primary accent-primary"
                                                            />
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-base">{opt.label || header}</span>
                                                                {header && opt.label && header !== opt.label && (
                                                                    <span className="text-xs text-muted-foreground">Coluna: {header}</span>
                                                                )}
                                                                <span className="text-xs text-muted-foreground mt-1">Amostra de valor: <strong className="text-foreground">{sampleValue}</strong></span>
                                                            </div>
                                                        </Label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            
                            <div className="flex gap-2 justify-end mt-6">
                                <Button variant="outline" onClick={() => {
                                    setStep('upload');
                                    setFile(null);
                                }}>
                                    Cancelar Importação
                                </Button>
                                <Button 
                                    onClick={handleResolveAmbiguities} 
                                    disabled={isLoading || (ambiguitiesList.some((a: any) => a.type === 'MULTIPLE_PRICES') && !selectedCostColumn)}
                                >
                                    {isLoading ? 'Processando...' : 'Confirmar e Continuar'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {step === 'preview' && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Pré-visualização — {parsedItems.length} itens</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Marca: <strong>{brandName}</strong>  •  Você pode editar os campos antes de confirmar.
                                </p>
                            </div>
                            <div className="space-x-2 flex">
                                <Button variant="outline" onClick={handleExportPreview} disabled={isLoading || parsedItems.length === 0} className="flex items-center gap-2">
                                    <FileDown className="h-4 w-4" /> Exportar Preview
                                </Button>
                                <Button variant="outline" onClick={() => setStep('upload')} disabled={isLoading}>
                                    Voltar
                                </Button>
                                <Button 
                                    onClick={handleExecuteClick} 
                                    disabled={isLoading || parsedItems.length === 0 || parsedItems.some(item => (importMode === 'AI' && item.confidence !== 'HIGH') || (item.anomalies && item.anomalies.length > 0))}
                                >
                                    {isLoading ? 'Salvando...' : 'Confirmar Importação'}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {importMode === 'AI' && parsedItems.some(item => item.confidence !== 'HIGH' || (item.anomalies && item.anomalies.length > 0)) && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm flex items-start gap-2">
                                    <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-500" />
                                    <div>
                                        <p className="font-semibold">Ação Necessária: Itens Pendentes de Revisão</p>
                                        <p>Você possui itens com alertas ou confiança média/baixa. Revise-os na tabela e clique no botão <strong className="text-green-700">Aprovar</strong> para poder prosseguir com a importação.</p>
                                    </div>
                                </div>
                            )}
                            
                            <div className="grid grid-cols-4 gap-4 p-4 border rounded-md bg-muted/20">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total de itens</p>
                                    <p className="text-2xl font-bold">{parsedItems.length}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Badge className="bg-green-600 scale-75 origin-left">Novo</Badge> Cadastros Novos</p>
                                    <p className="text-2xl font-bold">{parsedItems.filter(i => i.isNew).length}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Badge className="bg-blue-600 scale-75 origin-left">Atualização</Badge> Atualizações</p>
                                    <p className="text-2xl font-bold">{parsedItems.filter(i => !i.isNew).length}</p>
                                </div>
                                <div 
                                    className="cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors p-2 -m-2 rounded-md"
                                    onClick={() => {
                                        if (parsedItems.some(i => i.anomalies && i.anomalies.length > 0)) {
                                            setIsAnomalyDrawerOpen(true);
                                        }
                                    }}
                                >
                                    <p className="text-sm font-medium text-amber-600 flex items-center gap-1">⚠️ Com Alertas / Anomalias</p>
                                    <p className={`text-2xl font-bold ${parsedItems.some(i => i.anomalies && i.anomalies.length > 0) ? 'text-amber-600' : ''}`}>
                                        {parsedItems.filter(i => (i.anomalies && i.anomalies.length > 0) || i.confidence !== 'HIGH').length}
                                    </p>
                                    {parsedItems.some(i => i.anomalies && i.anomalies.length > 0) && (
                                        <p className="text-xs text-amber-600 mt-1 flex items-center"><Sparkles className="w-3 h-3 mr-1"/> Clique para corrigir</p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="rounded-md border max-h-[600px] overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[140px]">SKU</TableHead>
                                            <TableHead className="w-[100px]">Status</TableHead>
                                            <TableHead className="w-[70px]">Un.</TableHead>
                                            <TableHead className="min-w-[280px]">Nome</TableHead>
                                            <TableHead className="w-[110px]">Formato</TableHead>
                                            <TableHead className="w-[110px]">Linha</TableHead>
                                            <TableHead className="w-[100px]">Uso</TableHead>
                                            <TableHead className="w-[100px]">Cor</TableHead>
                                            <TableHead className="w-[80px]">Alt.</TableHead>
                                            <TableHead className="w-[80px]">Larg.</TableHead>
                                            <TableHead className="w-[80px]">Prof.</TableHead>
                                            <TableHead className="w-[80px]">Pç/Cx</TableHead>
                                            <TableHead className="w-[80px]">m²/Cx</TableHead>
                                            <TableHead className="w-[80px]">Cx/Pal</TableHead>
                                            <TableHead className="w-[80px]">Kg/Cx</TableHead>
                                            <TableHead className="text-right w-[120px]">Custo/m² (R$)</TableHead>
                                            <TableHead className="text-right w-[120px]">Custo Cx/Un (R$)</TableHead>
                                            <TableHead className="w-[100px]">NCM</TableHead>
                                            <TableHead className="w-[100px]">CEST</TableHead>
                                            <TableHead className="w-[80px]">CFOP</TableHead>
                                            <TableHead className="w-[80px]">CST</TableHead>
                                            <TableHead className="w-[130px]">Cód. Barras</TableHead>
                                            <TableHead className="w-[60px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {parsedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item, relIdx) => {
                                            const idx = (currentPage - 1) * itemsPerPage + relIdx;
                                            return (
                                            <TableRow key={idx} className={item.anomalies && item.anomalies.length > 0 ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}>
                                                <TableCell>
                                                    <Input
                                                        value={item.sku}
                                                        onChange={(e) => updateItem(idx, 'sku', e.target.value)}
                                                        className="h-8 font-mono text-xs w-[130px]"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        {item.isNew ? (
                                                            <Badge className="bg-green-600 hover:bg-green-700 w-fit">Novo</Badge>
                                                        ) : (
                                                            <div className="group relative w-fit">
                                                                <Badge className="bg-blue-600 hover:bg-blue-700">Atualização</Badge>
                                                                {item.oldCostCents !== undefined && (
                                                                    <div className="absolute left-full ml-2 hidden w-max rounded bg-popover p-2 text-xs shadow-md border group-hover:block z-10">
                                                                        <p>Custo atual: R$ {(item.oldCostCents / 100).toFixed(2)}</p>
                                                                        <p>Novo custo: R$ {(item.costCents / 100).toFixed(2)}</p>
                                                                        {(() => {
                                                                            const diff = item.costCents - item.oldCostCents;
                                                                            const pct = (Math.abs(diff) / item.oldCostCents) * 100;
                                                                            const isUp = diff > 0;
                                                                            return (
                                                                                <p className={`font-semibold ${isUp ? 'text-red-500' : 'text-green-500'}`}>
                                                                                    {isUp ? '+' : '-'}{pct.toFixed(1)}%
                                                                                </p>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {importMode === 'AI' && item.confidence && (
                                                            <Badge variant="outline" className={`w-fit text-[10px] ${item.confidence === 'HIGH' ? 'border-green-500 text-green-600' : item.confidence === 'MEDIUM' ? 'border-amber-500 text-amber-600' : 'border-red-500 text-red-600'}`}>
                                                                Confiança: {item.confidence === 'HIGH' ? 'Alta' : item.confidence === 'MEDIUM' ? 'Média' : 'Baixa'}
                                                            </Badge>
                                                        )}
                                                        {item.anomalies?.includes('DUPLICATE_SKU') && (
                                                            <Badge variant="destructive" className="w-fit text-[10px]" title="SKU já existe nesta mesma planilha">SKU Duplicado</Badge>
                                                        )}
                                                        {item.anomalies?.includes('PRICE_VARIATION') && (
                                                            <Badge variant="destructive" className="w-fit text-[10px] bg-amber-500 hover:bg-amber-600 border-none" title="Variação de custo superior a 50%">⚠️ Variação de Preço</Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs font-mono">
                                                        {item.unit || 'UN'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={item.name}
                                                        onChange={(e) => updateItem(idx, 'name', e.target.value)}
                                                        className="h-8"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={item.format || ''}
                                                        onChange={(e) => updateItem(idx, 'format', e.target.value)}
                                                        className="h-8 w-[90px]"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={item.line || ''}
                                                        onChange={(e) => updateItem(idx, 'line', e.target.value)}
                                                        className="h-8 w-[90px]"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={item.usage || ''}
                                                        onChange={(e) => updateItem(idx, 'usage', e.target.value)}
                                                        className="h-8 w-[80px]"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={item.color || ''}
                                                        onChange={(e) => updateItem(idx, 'color', e.target.value)}
                                                        className="h-8 w-[90px]"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number" step="0.1"
                                                        value={item.height || ''}
                                                        onChange={(e) => updateItem(idx, 'height', Number(e.target.value))}
                                                        className="h-8 w-[60px]" placeholder="—"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number" step="0.1"
                                                        value={item.width || ''}
                                                        onChange={(e) => updateItem(idx, 'width', Number(e.target.value))}
                                                        className="h-8 w-[60px]" placeholder="—"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number" step="0.1"
                                                        value={item.depth || ''}
                                                        onChange={(e) => updateItem(idx, 'depth', Number(e.target.value))}
                                                        className="h-8 w-[60px]" placeholder="—"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        value={item.piecesPerBox || ''}
                                                        onChange={(e) => updateItem(idx, 'piecesPerBox', parseInt(e.target.value) || 0)}
                                                        className="h-8 w-[55px]" placeholder="0"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number" step="0.01"
                                                        value={item.boxCoverage || ''}
                                                        onChange={(e) => updateItem(idx, 'boxCoverage', Number(e.target.value))}
                                                        className="h-8 w-[60px]" placeholder={isM2(item) ? "0.00" : "—"}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        value={item.palletBoxes || ''}
                                                        onChange={(e) => updateItem(idx, 'palletBoxes', parseInt(e.target.value) || 0)}
                                                        className="h-8 w-[55px]" placeholder="0"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number" step="0.1"
                                                        value={item.boxWeight || ''}
                                                        onChange={(e) => updateItem(idx, 'boxWeight', Number(e.target.value))}
                                                        className="h-8 w-[60px]" placeholder="0.0"
                                                    />
                                                </TableCell>
                                                {/* Custo/m² — editável apenas se for M2 */}
                                                <TableCell className="text-right">
                                                    {isM2(item) ? (
                                                        <Input
                                                            type="number" step="0.01"
                                                            title="Custo por m² (da planilha)"
                                                            value={item.costPerM2Cents != null ? (item.costPerM2Cents / 100).toFixed(2) : ''}
                                                            onChange={(e) => {
                                                                const val = Number(e.target.value);
                                                                const coverage = item.boxCoverage || 0;
                                                                const newItems = [...parsedItems];
                                                                newItems[idx].costPerM2Cents = Math.round(val * 100);
                                                                newItems[idx].costCents = coverage > 0
                                                                    ? Math.round(val * coverage * 100)
                                                                    : Math.round(val * 100);
                                                                setParsedItems(newItems);
                                                            }}
                                                            className="h-8 w-[90px] text-right"
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                {/* Custo Cx/Un — editável se for unidade, apenas leitura se for M2 */}
                                                <TableCell className="text-right">
                                                    {isM2(item) ? (
                                                        <span className="font-semibold text-emerald-700 text-sm">
                                                            R$ {(item.costCents / 100).toFixed(2)}
                                                        </span>
                                                    ) : (
                                                        <Input
                                                            type="number" step="0.01"
                                                            title="Custo Unitário (da planilha)"
                                                            value={(item.costCents / 100).toFixed(2)}
                                                            onChange={(e) => {
                                                                const val = Number(e.target.value);
                                                                const newItems = [...parsedItems];
                                                                newItems[idx].costCents = Math.round(val * 100);
                                                                setParsedItems(newItems);
                                                            }}
                                                            className="h-8 w-[90px] text-right"
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={item.ncm || ''}
                                                        onChange={(e) => updateItem(idx, 'ncm', e.target.value)}
                                                        className="h-8 w-[90px]" placeholder="NCM"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={item.cest || ''}
                                                        onChange={(e) => updateItem(idx, 'cest', e.target.value)}
                                                        className="h-8 w-[90px]" placeholder="CEST"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={item.cfop || ''}
                                                        onChange={(e) => updateItem(idx, 'cfop', e.target.value)}
                                                        className="h-8 w-[70px]" placeholder="CFOP"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={item.cst || ''}
                                                        onChange={(e) => updateItem(idx, 'cst', e.target.value)}
                                                        className="h-8 w-[70px]" placeholder="CST"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={item.barcode || ''}
                                                        onChange={(e) => updateItem(idx, 'barcode', e.target.value)}
                                                        className="h-8 w-[120px]" placeholder="EAN/GTIN"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center space-x-1">
                                                        {importMode === 'AI' && (item.confidence !== 'HIGH' || (item.anomalies && item.anomalies.length > 0)) && (
                                                            <Button
                                                                variant="outline" size="sm"
                                                                onClick={() => handleApproveItem(idx)}
                                                                className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                                                title="Aprovar e Marcar como Alta Confiança"
                                                            >
                                                                <Check className="h-4 w-4 mr-1" /> Aprovar
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost" size="sm"
                                                            onClick={() => {
                                                                setParsedItems(parsedItems.filter((_, i) => i !== idx));
                                                            }}
                                                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination Controls */}
                            {parsedItems.length > itemsPerPage && (
                                <div className="flex items-center justify-between mt-4">
                                    <div className="text-sm text-muted-foreground">
                                        Mostrando {(currentPage - 1) * itemsPerPage + 1} até {Math.min(currentPage * itemsPerPage, parsedItems.length)} de {parsedItems.length} itens
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            Anterior
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.min(Math.ceil(parsedItems.length / itemsPerPage), p + 1))}
                                            disabled={currentPage === Math.ceil(parsedItems.length / itemsPerPage)}
                                        >
                                            Próxima
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                <AlertDialog open={!!invalidTemplateError} onOpenChange={(open) => !open && setInvalidTemplateError(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Estrutura Incompatível</AlertDialogTitle>
                            <AlertDialogDescription>{invalidTemplateError}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogAction onClick={() => setInvalidTemplateError(null)}>Entendi</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <AlertDialog open={showPreConfirmation} onOpenChange={setShowPreConfirmation}>
                    <AlertDialogContent className="max-w-md">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Resumo Pré-Confirmação</AlertDialogTitle>
                            <AlertDialogDescription asChild>
                                <div className="space-y-4 pt-2 text-foreground text-sm">
                                    <div className="grid grid-cols-2 gap-2 border p-4 rounded-md bg-muted/20">
                                        <div className="font-medium text-muted-foreground">Marca:</div>
                                        <div className="font-semibold text-right">{brandName}</div>
                                        <div className="font-medium text-muted-foreground">Total de itens:</div>
                                        <div className="font-semibold text-right">{parsedItems.length}</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 px-2">
                                        <div className="flex items-center gap-2"><Badge className="bg-green-600">Novo</Badge></div>
                                        <div className="font-semibold text-right">{parsedItems.filter(i => i.isNew).length} itens</div>
                                        <div className="flex items-center gap-2"><Badge className="bg-blue-600">Atualização</Badge></div>
                                        <div className="font-semibold text-right">{parsedItems.filter(i => !i.isNew).length} itens</div>
                                        <div className="flex items-center gap-2 text-amber-600 font-medium">⚠️ Com Alertas</div>
                                        <div className="font-semibold text-right">{parsedItems.filter(i => i.anomalies && i.anomalies.length > 0).length} itens</div>
                                    </div>
                                    <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                                        Clique em "Confirmar Importação" para salvar os dados no sistema.
                                    </div>
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setShowPreConfirmation(false)}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={executeImport}>✅ Confirmar Importação</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Sheet open={isAnomalyDrawerOpen} onOpenChange={setIsAnomalyDrawerOpen}>
                    <SheetContent className="w-[400px] sm:w-[540px] sm:max-w-md overflow-y-auto">
                        <SheetHeader className="mb-6">
                            <SheetTitle className="text-amber-600 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" /> Gaveta de Anomalias
                            </SheetTitle>
                            <SheetDescription>
                                Corrija os problemas detectados pela inteligência artificial antes de prosseguir.
                            </SheetDescription>
                        </SheetHeader>
                        
                        <div className="space-y-6">
                            {parsedItems.map((item, idx) => {
                                if (!item.anomalies || item.anomalies.length === 0) return null;
                                
                                return (
                                    <div key={idx} className="border border-amber-200 bg-amber-50 dark:bg-amber-950/20 rounded-md p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-medium text-sm text-amber-900 dark:text-amber-400 flex items-center gap-2">
                                                    Item {idx + 1}
                                                </h4>
                                                <p className="text-xs text-muted-foreground line-clamp-1">{item.name}</p>
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-6 px-2 text-destructive" onClick={() => handleDeleteItem(idx)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <div className="space-y-2">
                                            {item.anomalies.map((anomaly: any, i: number) => {
                                                const type = typeof anomaly === 'string' ? anomaly : anomaly.type;
                                                const isDuplicate = type === 'DUPLICATE_SKU';
                                                
                                                let label = type;
                                                if (isDuplicate) label = '❌ SKU Duplicado';
                                                else if (type === 'PRICE_VARIATION') label = '⚠️ Variação de Preço (>50%)';
                                                else if (type === 'MISSING_SKU') label = '❌ SKU Ausente / Vazio';
                                                else if (type === 'MISSING_COST') label = '❌ Custo Zerado / Ausente';

                                                return (
                                                    <div key={i} className="text-xs bg-white dark:bg-slate-900 p-2 rounded border">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="font-semibold text-red-600 block mb-1">
                                                                {label}
                                                            </span>
                                                            {type !== 'MISSING_SKU' && type !== 'MISSING_COST' && (
                                                                <Button size="sm" variant="outline" className="text-[10px] h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200" onClick={() => handleApproveAnomaly(idx, i)}>
                                                                    Aprovar Exceção
                                                                </Button>
                                                            )}
                                                        </div>

                                                        {isDuplicate && anomaly.relatedIndices && (
                                                            <span className="text-muted-foreground block mb-2">
                                                                Este SKU também aparece nas linhas: {anomaly.relatedIndices.map((r: number) => r + 1).join(', ')}
                                                            </span>
                                                        )}
                                                        
                                                        {isDuplicate || type === 'MISSING_SKU' ? (
                                                            <div className="space-y-1 mt-2">
                                                                <Label className="text-xs">Definir SKU Único:</Label>
                                                                <Input 
                                                                    value={item.sku || ''} 
                                                                    onChange={(e) => updateItem(idx, 'sku', e.target.value)}
                                                                    className="h-7 text-xs font-mono"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-1 mt-2">
                                                                <Label className="text-xs">Confirmar Custo (R$):</Label>
                                                                <Input 
                                                                    type="number"
                                                                    value={(item.costCents || 0) / 100} 
                                                                    onChange={(e) => updateItem(idx, 'costCents', parseFloat(e.target.value) * 100)}
                                                                    className="h-7 text-xs font-mono"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="pt-2 flex justify-end border-t border-amber-200">
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => handleApproveItem(idx)}
                                                className="h-7 text-xs bg-white hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                                            >
                                                <Check className="w-3 h-3 mr-1" /> Marcar como Resolvido
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}

                            {!parsedItems.some(i => i.anomalies && i.anomalies.length > 0) && (
                                <div className="text-center p-6 text-muted-foreground text-sm">
                                    <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                    Nenhuma anomalia pendente!
                                </div>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
    );
}
