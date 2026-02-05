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
import api from '../../../../lib/api';
import { toast } from 'sonner';
import { AuthContext } from '../../../../contexts/auth-context';

export default function ImportProductsPage() {
    const { activeClinic } = useContext(AuthContext);
    const [file, setFile] = useState<File | null>(null);
    const [strategy, setStrategy] = useState<string>('');
    const [supplierId, setSupplierId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const [parsedItems, setParsedItems] = useState<any[]>([]);

    // Fetch Suppliers
    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers'],
        queryFn: async () => {
            const res = await api.get('/suppliers'); // Adjust endpoint if needed
            return res.data; // Assuming generic list
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleParse = async () => {
        if (!file || !strategy || !supplierId) {
            toast.error('Selecione um arquivo, um fornecedor e um layout.');
            return;
        }

        setIsLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post(`/stock/products/import/parse?strategy=${strategy}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setParsedItems(response.data.items);
            setStep('preview');
            toast.success('Arquivo processado! Verifique os dados abaixo.');
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Falha ao ler arquivo.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExecute = async () => {
        setIsLoading(true);
        try {
            const payload = {
                supplierId,
                clinicId: activeClinic,
                items: parsedItems
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
                                    <SelectItem value="CASTELLI">Castelli (Padrão)</SelectItem>
                                    <SelectItem value="EMBRAMACO">Embramaco</SelectItem>
                                    <SelectItem value="PIERINI">Pierini</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label>Arquivo Excel (.xlsx)</Label>
                            <Input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
                        </div>

                        <Button onClick={handleParse} disabled={isLoading || !file || !strategy || !supplierId}>
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
                            <Button onClick={handleExecute} disabled={isLoading}>
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
                                        <TableHead className="min-w-[200px]">Nome</TableHead>
                                        <TableHead>Formato</TableHead>
                                        <TableHead>Linha</TableHead>
                                        <TableHead>Uso</TableHead>
                                        <TableHead className="w-[80px]">Pç/Cx</TableHead>
                                        <TableHead className="w-[80px]">m²/Cx</TableHead>
                                        <TableHead className="w-[80px]">Cx/Pal</TableHead>
                                        <TableHead className="w-[80px]">Kg/Cx</TableHead>
                                        <TableHead className="text-right w-[100px]">Custo (R$)</TableHead>
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
                                                    value={item.costCents / 100}
                                                    onChange={(e) => {
                                                        const newItems = [...parsedItems];
                                                        newItems[idx].costCents = Math.round(Number(e.target.value) * 100);
                                                        setParsedItems(newItems);
                                                    }}
                                                    className="h-8 w-[80px] text-right"
                                                />
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
        </div>
    );
}
