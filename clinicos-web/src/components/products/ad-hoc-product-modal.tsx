import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'sonner';

interface AdHocProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (product: any) => void;
}

export function AdHocProductModal({ isOpen, onClose, onSuccess }: AdHocProductModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [brands, setBrands] = useState<any[]>([]);

    // Fetch options on mount
    useEffect(() => {
        if (isOpen) {
            api.get('/catalogue/categories').then((res: any) => setCategories(res.data)).catch(console.error);
            api.get('/catalogue/brands').then((res: any) => setBrands(res.data)).catch(console.error);
        }
    }, [isOpen]);

    // Form fields
    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState('none');
    const [brandId, setBrandId] = useState('none');
    const [unit, setUnit] = useState('un');
    const [saleType, setSaleType] = useState('UNIT');
    const [boxCoverage, setBoxCoverage] = useState('');
    const [piecesPerBox, setPiecesPerBox] = useState('');
    const [cost, setCost] = useState('');
    const [markup, setMarkup] = useState('');
    const [finalPrice, setFinalPrice] = useState('0.00');

    // Auto calculate final price
    useEffect(() => {
        const costNum = parseFloat(cost) || 0;
        const markupNum = parseFloat(markup) || 0;

        if (costNum > 0 && markupNum > 0) {
            const calculated = costNum * (1 + (markupNum / 100));
            setFinalPrice(calculated.toFixed(2));
        } else if (costNum > 0) {
            setFinalPrice(costNum.toFixed(2));
        } else {
            setFinalPrice('0.00');
        }
    }, [cost, markup]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
            toast.error('O nome do produto é obrigatório.');
            return;
        }

        setIsLoading(true);
        try {
            const payload: any = {
                name,
                isAdhoc: true, // IMPORTANT: Marks as extraordinary
                unit,
                saleType,
                manualPrice: false
            };

            if (categoryId !== 'none') payload.categoryId = categoryId;
            if (brandId !== 'none') payload.brandId = brandId;

            if (boxCoverage) payload.boxCoverage = parseFloat(boxCoverage);
            if (piecesPerBox) payload.piecesPerBox = parseInt(piecesPerBox, 10);

            if (cost) payload.costCents = Math.round(parseFloat(cost) * 100);
            if (markup) payload.markup = parseFloat(markup);

            // Sempre envia o priceCents calculado no frontend para que a
            // criação já retorne o valor preenchido no banco, evitando preço 0 no orçamento
            const parsedFinal = parseFloat(finalPrice);
            if (parsedFinal > 0) {
                payload.priceCents = Math.round(parsedFinal * 100);
                if (!markup) {
                    payload.manualPrice = true;
                }
            }

            const response = await api.post('/stock/products', payload);
            toast.success('Produto avulso adicionado com sucesso!');

            // Re-fetch the newly created product immediately
            onSuccess(response.data);

            // Reset form
            setName('');
            setCategoryId('none');
            setBrandId('none');
            setUnit('un');
            setSaleType('UNIT');
            setBoxCoverage('');
            setPiecesPerBox('');
            setCost('');
            setMarkup('');
            onClose();

        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Erro ao criar produto avulso.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Produto Extraordinário (Sob Encomenda)</DialogTitle>
                    <DialogDescription>
                        Crie um produto avulso rapidamente. Ele será inserido no orçamento e ocultado do catálogo principal.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {/* Linha 1: Nome */}
                    <div className="space-y-2">
                        <Label>Nome do Produto *</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Porcelanato Personalizado Cliente X"
                            required
                        />
                    </div>

                    {/* Linha 2: Categoria e Marca */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Categoria</Label>
                            <Select value={categoryId} onValueChange={setCategoryId}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhuma</SelectItem>
                                    {categories.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Marca</Label>
                            <Select value={brandId} onValueChange={setBrandId}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhuma</SelectItem>
                                    {brands.map((b) => (
                                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Linha 3: Unidades e Tipo */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Unidade de Medida</Label>
                            <Select value={unit} onValueChange={setUnit}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="un">Unidade (un)</SelectItem>
                                    <SelectItem value="m2">Metro Quadrado (m²)</SelectItem>
                                    <SelectItem value="cx">Caixa (cx)</SelectItem>
                                    <SelectItem value="ml">Metro Linear (ml)</SelectItem>
                                    <SelectItem value="kg">Quilograma (kg)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo de Venda</Label>
                            <Select value={saleType} onValueChange={setSaleType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="UNIT">Por Unidade/Caixa</SelectItem>
                                    <SelectItem value="AREA">Por Metro (M²)</SelectItem>
                                    <SelectItem value="BOTH">Ambos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Linha 4: Metragem de Revestimentos */}
                    {saleType !== 'UNIT' && (
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border">
                            <div className="space-y-2">
                                <Label>Cobertura (M² por Caixa)</Label>
                                <Input type="number" step="0.0001" min="0" value={boxCoverage} onChange={(e) => setBoxCoverage(e.target.value)} placeholder="Ex: 1.44" />
                            </div>
                            <div className="space-y-2">
                                <Label>Peças por Caixa</Label>
                                <Input type="number" min="0" value={piecesPerBox} onChange={(e) => setPiecesPerBox(e.target.value)} placeholder="Ex: 6" />
                            </div>
                        </div>
                    )}

                    {/* Linha 5: Precificação */}
                    <div className="grid grid-cols-3 gap-4 border-t pt-4">
                        <div className="space-y-2">
                            <Label>Custo de Compra (R$)</Label>
                            <Input type="number" step="0.01" min="0" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0,00" />
                        </div>
                        <div className="space-y-2">
                            <Label>Markup (%)</Label>
                            <Input type="number" step="0.01" min="0" value={markup} onChange={(e) => setMarkup(e.target.value)} placeholder="Ex: 40" />
                        </div>
                        <div className="space-y-2">
                            <Label>Preço Final (R$)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className="font-bold text-green-700 bg-green-50"
                                value={finalPrice}
                                onChange={(e) => setFinalPrice(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading} className="bg-amber-600 hover:bg-amber-700">
                            {isLoading ? 'Salvando...' : 'Adicionar Ad-Hoc'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
