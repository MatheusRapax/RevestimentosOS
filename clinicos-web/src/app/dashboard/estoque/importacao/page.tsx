'use client';

import { useState, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { Trash2 } from 'lucide-react';
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

export default function ImportProductsPage() {
    const { activeClinic } = useContext(AuthContext);
    const [file, setFile] = useState<File | null>(null);
    const [strategy, setStrategy] = useState<string>('');
    const [supplierId, setSupplierId] = useState<string>('');
    const [brandName, setBrandName] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const [parsedItems, setParsedItems] = useState<any[]>([]);
    const [invalidTemplateError, setInvalidTemplateError] = useState<string | null>(null);
    const [showMissingFieldsWarning, setShowMissingFieldsWarning] = useState(false);

    const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
    const [newBrandInput, setNewBrandInput] = useState('');

    // Fetch Suppliers
    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers'],
        queryFn: async () => {
            const res = await api.get('/suppliers'); // Adjust endpoint if needed
            return res.data; // Assuming generic list
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

    const handleParse = async () => {
        if (!file || !strategy || !supplierId || !brandName) {
            toast.error('Selecione um arquivo, um fornecedor, uma marca e um layout.');
            return;
        }

        setIsLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post(`/stock/products/import/parse?strategy=${strategy}&clinicId=${activeClinic || ''}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
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
        const hasMissingFields = parsedItems.some(item => 
            !item.sku || !item.name || !item.format || !item.line || !item.usage || 
            !item.piecesPerBox || !item.boxCoverage || !item.palletBoxes || !item.boxWeight || !item.costCents
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
                strategy,
                brandName: brandName.trim() || undefined,
                items: parsedItems.map(({ isNew, ...rest }) => rest)
            };
            await api.post('/stock/products/import/execute', payload);
            toast.success(`Importação realizada com sucesso! ${parsedItems.length} produtos salvos.`);
            // Reset
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

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Importação de Produtos</h1>

            {step === 'upload' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Configuração da Importação</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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

                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label>Layout do Arquivo</Label>
                            <Select onValueChange={setStrategy} value={strategy}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o modelo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="STANDARD">Padrão Oficial do Sistema (Recomendado)</SelectItem>
                                    <SelectItem value="CASTELLI">Castelli (Planilha Original)</SelectItem>
                                    <SelectItem value="EMBRAMACO">Embramaco</SelectItem>
                                    <SelectItem value="PIERINI">Pierini</SelectItem>
                                    <SelectItem value="STRUFALDI">Strufaldi</SelectItem>
                                    <SelectItem value="BOUTIQUE BRASIL">Boutique Brasil</SelectItem>
                                    <SelectItem value="GLAM BRASIL">Glam Brasil</SelectItem>
                                    <SelectItem value="MOSAIC">Mosaic</SelectItem>
                                    <SelectItem value="LEXXA BAGNO">Lexxa Bagno</SelectItem>
                                    <SelectItem value="DECA">Deca</SelectItem>
                                    <SelectItem value="DEXCO">Dexco</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label>Marca / Fabricante (Obrigatório)</Label>
                            <div className="flex gap-2">
                                <Select onValueChange={setBrandName} value={brandName || undefined}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Selecione ou adicione" />
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

                                <Dialog open={isBrandModalOpen} onOpenChange={setIsBrandModalOpen}>
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
                                                    onChange={(e) => setNewBrandInput(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setIsBrandModalOpen(false)}>Cancelar</Button>
                                            <Button onClick={() => {
                                                if (newBrandInput.trim()) {
                                                    setBrandName(newBrandInput.trim());
                                                    setIsBrandModalOpen(false);
                                                    setNewBrandInput('');
                                                }
                                            }}>Confirmar</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Se preenchido, aplicará esta marca a todos os produtos importados.
                            </p>
                        </div>

                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label>Arquivo Excel/CSV (.xlsx, .csv)</Label>
                            <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
                        </div>

                        <Button onClick={handleParse} disabled={isLoading || !file || !strategy || !supplierId || !brandName}>
                            {isLoading ? 'Lendo Arquivo...' : 'Pré-visualizar Importação'}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {step === 'preview' && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Pré-visualização ({parsedItems.length} itens)</CardTitle>
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
                                        <TableHead className="w-[100px]">Status</TableHead>
                                        <TableHead className="min-w-[200px]">Nome</TableHead>
                                        <TableHead>Formato</TableHead>
                                        <TableHead>Linha</TableHead>
                                        <TableHead>Uso</TableHead>
                                        <TableHead>Cor</TableHead>
                                        <TableHead className="w-[80px]">Alt.</TableHead>
                                        <TableHead className="w-[80px]">Larg.</TableHead>
                                        <TableHead className="w-[80px]">Prof.</TableHead>
                                        <TableHead className="w-[80px]">Pç/Cx</TableHead>
                                        <TableHead className="w-[80px]">m²/Cx</TableHead>
                                        <TableHead className="w-[80px]">Cx/Pal</TableHead>
                                        <TableHead className="w-[80px]">Kg/Cx</TableHead>
                                        <TableHead className="text-right w-[100px]">Custo/m² (R$)</TableHead>
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
                                                    onChange={(e) => {
                                                        const newItems = [...parsedItems];
                                                        newItems[idx].sku = e.target.value;
                                                        setParsedItems(newItems);
                                                    }}
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
                                                <Input
                                                    value={item.name}
                                                    onChange={(e) => {
                                                        const newItems = [...parsedItems];
                                                        newItems[idx].name = e.target.value;
                                                        setParsedItems(newItems);
                                                    }}
                                                    className="h-8"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={item.format}
                                                    onChange={(e) => {
                                                        const newItems = [...parsedItems];
                                                        newItems[idx].format = e.target.value;
                                                        setParsedItems(newItems);
                                                    }}
                                                    className="h-8 w-[100px]"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={item.line}
                                                    onChange={(e) => {
                                                        const newItems = [...parsedItems];
                                                        newItems[idx].line = e.target.value;
                                                        setParsedItems(newItems);
                                                    }}
                                                    className="h-8 w-[100px]"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={item.usage}
                                                    onChange={(e) => {
                                                        const newItems = [...parsedItems];
                                                        newItems[idx].usage = e.target.value;
                                                        setParsedItems(newItems);
                                                    }}
                                                    className="h-8 w-[80px]"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={item.color || ''}
                                                    onChange={(e) => {
                                                        const newItems = [...parsedItems];
                                                        newItems[idx].color = e.target.value;
                                                        setParsedItems(newItems);
                                                    }}
                                                    className="h-8 w-[100px]"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    value={item.height || ''}
                                                    onChange={(e) => {
                                                        const newItems = [...parsedItems];
                                                        newItems[idx].height = Number(e.target.value);
                                                        setParsedItems(newItems);
                                                    }}
                                                    className="h-8 w-[60px]"
                                                    placeholder="0"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    value={item.width || ''}
                                                    onChange={(e) => {
                                                        const newItems = [...parsedItems];
                                                        newItems[idx].width = Number(e.target.value);
                                                        setParsedItems(newItems);
                                                    }}
                                                    className="h-8 w-[60px]"
                                                    placeholder="0"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    value={item.depth || ''}
                                                    onChange={(e) => {
                                                        const newItems = [...parsedItems];
                                                        newItems[idx].depth = Number(e.target.value);
                                                        setParsedItems(newItems);
                                                    }}
                                                    className="h-8 w-[60px]"
                                                    placeholder="0"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={item.piecesPerBox || ''}
                                                    onChange={(e) => {
                                                        const newItems = [...parsedItems];
                                                        newItems[idx].piecesPerBox = parseInt(e.target.value) || 0;
                                                        setParsedItems(newItems);
                                                    }}
                                                    className="h-8 w-[60px]"
                                                    placeholder="0"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.boxCoverage || ''}
                                                    onChange={(e) => {
                                                        const newItems = [...parsedItems];
                                                        newItems[idx].boxCoverage = Number(e.target.value);
                                                        setParsedItems(newItems);
                                                    }}
                                                    className="h-8 w-[60px]"
                                                    placeholder="0.00"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={item.palletBoxes || ''}
                                                    onChange={(e) => {
                                                        const newItems = [...parsedItems];
                                                        newItems[idx].palletBoxes = parseInt(e.target.value) || 0;
                                                        setParsedItems(newItems);
                                                    }}
                                                    className="h-8 w-[60px]"
                                                    placeholder="0"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    value={item.boxWeight || ''}
                                                    onChange={(e) => {
                                                        const newItems = [...parsedItems];
                                                        newItems[idx].boxWeight = Number(e.target.value);
                                                        setParsedItems(newItems);
                                                    }}
                                                    className="h-8 w-[60px]"
                                                    placeholder="0.0"
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={(item.costPerM2Cents ?? item.costCents) / 100}
                                                    onChange={(e) => {
                                                        const newItems = [...parsedItems];
                                                        const coverage = newItems[idx].boxCoverage || 0;
                                                        const m2Val = Number(e.target.value);
                                                        newItems[idx].costPerM2Cents = Math.round(m2Val * 100);
                                                        newItems[idx].costCents = coverage > 0
                                                            ? Math.round(m2Val * coverage * 100)
                                                            : Math.round(m2Val * 100);
                                                        setParsedItems(newItems);
                                                    }}
                                                    className="h-8 w-[80px] text-right"
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {item.boxCoverage && item.boxCoverage > 0 ? (
                                                    <span className="font-semibold text-emerald-700">
                                                        R$ {(item.costCents / 100).toFixed(2)}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-amber-600" title="Produto sem m²/Cx — custo importado como unitário">
                                                        R$ {(item.costCents / 100).toFixed(2)}
                                                        <span className="ml-1">⚠️</span>
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        const newItems = parsedItems.filter((_, i) => i !== idx);
                                                        setParsedItems(newItems);
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
                        <AlertDialogDescription>
                            {invalidTemplateError}
                        </AlertDialogDescription>
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
                            Existem produtos com campos não preenchidos (ex: formato, linha, caixa, peso ou custo iguais a zero ou em branco). 
                            Tem certeza que deseja continuar a importação assim mesmo ou prefere revisar?
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
