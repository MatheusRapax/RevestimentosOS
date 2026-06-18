'use client';

import { useState, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { Trash2, Download, Lock, Sparkles } from 'lucide-react';
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

import api from '../../../../lib/api';
import { toast } from 'sonner';
import { AuthContext } from '../../../../contexts/auth-context';

const STRATEGY = 'STANDARD';

export default function ImportProductsPage() {
    const { activeClinic } = useContext(AuthContext);
    const queryClient = useQueryClient();

    const [file, setFile] = useState<File | null>(null);
    const [supplierId, setSupplierId] = useState<string>('');
    const [brandName, setBrandName] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const [parsedItems, setParsedItems] = useState<any[]>([]);
    const [invalidTemplateError, setInvalidTemplateError] = useState<string | null>(null);
    const [showMissingFieldsWarning, setShowMissingFieldsWarning] = useState(false);

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
            const response = await api.post(
                `/stock/products/import/parse?strategy=${STRATEGY}&clinicId=${activeClinic || ''}`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );
            setParsedItems(response.data.items);
            setStep('preview');
            toast.success('Arquivo processado! Verifique os dados abaixo.');
        } catch (error: any) {
            console.error(error);
            const errData = error.response?.data;
            if (errData?.code === 'INVALID_TEMPLATE') {
                setInvalidTemplateError(errData.message);
            } else {
                toast.error(errData?.message || 'Falha ao ler arquivo.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleExecuteClick = () => {
        // For standard layout, only SKU, name and costCents are truly required
        const hasMissingFields = parsedItems.some(item =>
            !item.sku || !item.name || !item.costCents
        );

        if (hasMissingFields) {
            setShowMissingFieldsWarning(true);
        } else {
            executeImport();
        }
    };

    const executeImport = async () => {
        setShowMissingFieldsWarning(false);
        setIsLoading(true);
        try {
            const payload = {
                supplierId,
                clinicId: activeClinic,
                strategy: STRATEGY,
                brandName: brandName.trim() || undefined,
                items: parsedItems.map(({ isNew, ...rest }) => rest),
            };
            await api.post('/stock/products/import/execute', payload);
            toast.success(`Importação realizada com sucesso! ${parsedItems.length} produtos salvos.`);
            setFile(null);
            setParsedItems([]);
            setStep('upload');
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

    return (
        <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight">Importação de Produtos</h1>

                    {/* IA locked card */}
                    <div
                        title="A importação com IA lerá automaticamente a tabela do seu fornecedor e converterá para o formato padrão, sem preenchimento manual. Disponível em breve!"
                        className="flex items-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 px-4 py-2 cursor-not-allowed select-none opacity-70"
                    >
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium text-muted-foreground">Importação com IA</span>
                        <Badge variant="outline" className="text-xs border-amber-400 text-amber-600 ml-1">Em breve</Badge>
                    </div>
                </div>

                {step === 'upload' && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle>Configuração da Importação</CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Use o <strong>Template Padrão</strong> do sistema. Suporta produtos por M² e por unidade na mesma planilha.
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-2 shrink-0"
                                    onClick={handleDownloadTemplate}
                                >
                                    <Download className="h-4 w-4" />
                                    Baixar Template Padrão
                                </Button>
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
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label>Arquivo Excel (.xlsx)</Label>
                                <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
                                <p className="text-xs text-muted-foreground">
                                    Utilize o template padrão do sistema. A coluna "Unidade de Medida" define o tipo: M2, UN, CX, ML ou PC.
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

                {step === 'preview' && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Pré-visualização — {parsedItems.length} itens</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Marca: <strong>{brandName}</strong>  •  Você pode editar os campos antes de confirmar.
                                </p>
                            </div>
                            <div className="space-x-2">
                                <Button variant="outline" onClick={() => setStep('upload')} disabled={isLoading}>
                                    Voltar
                                </Button>
                                <Button onClick={handleExecuteClick} disabled={isLoading}>
                                    {isLoading ? 'Salvando...' : 'Confirmar Importação'}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border max-h-[600px] overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[100px]">SKU</TableHead>
                                            <TableHead className="w-[90px]">Status</TableHead>
                                            <TableHead className="w-[60px]">Un.</TableHead>
                                            <TableHead className="min-w-[200px]">Nome</TableHead>
                                            <TableHead>Formato</TableHead>
                                            <TableHead>Linha</TableHead>
                                            <TableHead>Uso</TableHead>
                                            <TableHead>Cor</TableHead>
                                            <TableHead className="w-[70px]">Alt.</TableHead>
                                            <TableHead className="w-[70px]">Larg.</TableHead>
                                            <TableHead className="w-[70px]">Prof.</TableHead>
                                            <TableHead className="w-[70px]">Pç/Cx</TableHead>
                                            <TableHead className="w-[70px]">m²/Cx</TableHead>
                                            <TableHead className="w-[70px]">Cx/Pal</TableHead>
                                            <TableHead className="w-[70px]">Kg/Cx</TableHead>
                                            <TableHead className="text-right w-[110px]">Custo/m² (R$)</TableHead>
                                            <TableHead className="text-right w-[110px]">Custo/Cx (R$)</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {parsedItems.map((item, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>
                                                    <Input
                                                        value={item.sku}
                                                        onChange={(e) => updateItem(idx, 'sku', e.target.value)}
                                                        className="h-8 font-mono text-xs"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {item.isNew ? (
                                                        <Badge className="bg-green-600 hover:bg-green-700">Novo</Badge>
                                                    ) : (
                                                        <Badge className="bg-blue-600 hover:bg-blue-700">Atualização</Badge>
                                                    )}
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
                                                {/* Custo/m² — editable (what the user typed in the spreadsheet) */}
                                                <TableCell className="text-right">
                                                    <Input
                                                        type="number" step="0.01"
                                                        title="Custo por m² (da planilha)"
                                                        value={
                                                            isM2(item) && item.costPerM2Cents != null
                                                                ? (item.costPerM2Cents / 100).toFixed(2)
                                                                : (item.costCents / 100).toFixed(2)
                                                        }
                                                        onChange={(e) => {
                                                            const val = Number(e.target.value);
                                                            const coverage = item.boxCoverage || 0;
                                                            const newItems = [...parsedItems];
                                                            if (isM2(item)) {
                                                                newItems[idx].costPerM2Cents = Math.round(val * 100);
                                                                // box cost = m² cost × m²/cx
                                                                newItems[idx].costCents = coverage > 0
                                                                    ? Math.round(val * coverage * 100)
                                                                    : Math.round(val * 100);
                                                            } else {
                                                                newItems[idx].costCents = Math.round(val * 100);
                                                            }
                                                            setParsedItems(newItems);
                                                        }}
                                                        className="h-8 w-[90px] text-right"
                                                    />
                                                </TableCell>
                                                {/* Custo/Cx — read-only derived value (shown for reference) */}
                                                <TableCell className="text-right">
                                                    {isM2(item) && item.boxCoverage && item.boxCoverage > 0 ? (
                                                        <span className="font-semibold text-emerald-700 text-sm">
                                                            R$ {(item.costCents / 100).toFixed(2)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost" size="sm"
                                                        onClick={() => {
                                                            setParsedItems(parsedItems.filter((_, i) => i !== idx));
                                                        }}
                                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
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

                <AlertDialog open={showMissingFieldsWarning} onOpenChange={setShowMissingFieldsWarning}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Campos Incompletos Detectados</AlertDialogTitle>
                            <AlertDialogDescription>
                                Existem produtos sem SKU, nome ou custo. Deseja continuar mesmo assim?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setShowMissingFieldsWarning(false)}>Revisar Dados</AlertDialogCancel>
                            <AlertDialogAction onClick={executeImport}>Continuar Importação</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
    );
}
