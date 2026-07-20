import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, AlertCircle } from 'lucide-react';
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
    const [showExtras, setShowExtras] = useState(false);

    useEffect(() => {
        if (isOpen) {
            api.get('/catalogue/categories').then((res: any) => setCategories(res.data)).catch(console.error);
            api.get('/catalogue/brands').then((res: any) => setBrands(res.data)).catch(console.error);
        }
    }, [isOpen]);

    // --- Core fields ---
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('un');
    const [saleType, setSaleType] = useState('UNIT');

    // --- M2 mandatory fields ---
    const [boxCoverage, setBoxCoverage] = useState('');
    const [piecesPerBox, setPiecesPerBox] = useState('');

    // --- Pricing ---
    const [cost, setCost] = useState('');
    const [markup, setMarkup] = useState('');
    const [finalPrice, setFinalPrice] = useState('0.00');

    // --- Optional extra fields ---
    const [categoryId, setCategoryId] = useState('none');
    const [brandId, setBrandId] = useState('none');
    const [format, setFormat] = useState('');
    const [color, setColor] = useState('');
    const [line, setLine] = useState('');
    const [height, setHeight] = useState('');
    const [width, setWidth] = useState('');
    const [ncm, setNcm] = useState('');
    const [sku, setSku] = useState('');

    // Derived
    const isM2Unit = unit === 'm2' || unit === 'M2';
    const needsCoverage = isM2Unit || saleType === 'AREA' || saleType === 'BOTH';
    const coverageNum = parseFloat(boxCoverage) || 0;
    const costNum = parseFloat(cost) || 0;
    const costPerM2 = needsCoverage && coverageNum > 0 ? costNum / coverageNum : null;

    // Auto-sync: se unidade for M2, força saleType para AREA
    useEffect(() => {
        if (isM2Unit) setSaleType('AREA');
    }, [isM2Unit]);

    // Auto-price calculation
    useEffect(() => {
        const markupNum = parseFloat(markup) || 0;
        const effectiveCost = costPerM2 ?? costNum;

        if (effectiveCost > 0 && markupNum > 0) {
            setFinalPrice(((effectiveCost * (1 + markupNum / 100)) ).toFixed(2));
        } else if (effectiveCost > 0) {
            setFinalPrice(effectiveCost.toFixed(2));
        } else {
            setFinalPrice('0.00');
        }
    }, [cost, markup, boxCoverage, isM2Unit, saleType]);

    const validate = (): string | null => {
        if (!name.trim()) return 'O nome do produto é obrigatório.';
        if (needsCoverage && !boxCoverage) return 'Para produtos vendidos por M², a cobertura da caixa (m²/cx) é obrigatória.';
        if (needsCoverage && coverageNum <= 0) return 'A cobertura deve ser maior que zero.';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const err = validate();
        if (err) { toast.error(err); return; }

        setIsLoading(true);
        try {
            const payload: any = {
                name: name.trim(),
                isAdhoc: true,
                unit,
                saleType,
                manualPrice: false,
            };

            if (categoryId !== 'none') payload.categoryId = categoryId;
            if (brandId !== 'none') payload.brandId = brandId;
            if (boxCoverage) payload.boxCoverage = coverageNum;
            if (piecesPerBox) payload.piecesPerBox = parseInt(piecesPerBox, 10);
            if (format.trim()) payload.format = format.trim();
            if (color.trim()) payload.color = color.trim();
            if (line.trim()) payload.line = line.trim();
            if (height) payload.height = parseFloat(height);
            if (width) payload.width = parseFloat(width);
            if (ncm.trim()) payload.ncm = ncm.trim();
            if (sku.trim()) payload.sku = sku.trim();

            if (cost) {
                payload.costCents = Math.round(costNum * 100);
            }
            if (markup) payload.markup = parseFloat(markup);

            const parsedFinal = parseFloat(finalPrice);
            if (parsedFinal > 0) {
                payload.priceCents = Math.round(parsedFinal * 100);
                if (!markup) payload.manualPrice = true;
            }

            const response = await api.post('/stock/products', payload);
            toast.success('Produto avulso criado com sucesso!');
            onSuccess(response.data);
            resetForm();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Erro ao criar produto avulso.');
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setName(''); setUnit('un'); setSaleType('UNIT');
        setBoxCoverage(''); setPiecesPerBox('');
        setCost(''); setMarkup(''); setFinalPrice('0.00');
        setCategoryId('none'); setBrandId('none');
        setFormat(''); setColor(''); setLine('');
        setHeight(''); setWidth(''); setNcm(''); setSku('');
        setShowExtras(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose(); } }}>
            <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Produto Extraordinário (Sob Encomenda)</DialogTitle>
                    <DialogDescription>
                        Crie um produto avulso para este orçamento. Ele ficará oculto do catálogo principal, mas pode ser promovido depois.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 py-2">

                    {/* Nome */}
                    <div className="space-y-1.5">
                        <Label>Nome do Produto <span className="text-red-500">*</span></Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Porcelanato Personalizado Cliente X" autoFocus />
                    </div>

                    {/* Unidade + Tipo de Venda */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Unidade de Medida <span className="text-red-500">*</span></Label>
                            <Select value={unit} onValueChange={setUnit}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="un">Unidade (un)</SelectItem>
                                    <SelectItem value="m2">Metro Quadrado (m²)</SelectItem>
                                    <SelectItem value="cx">Caixa (cx)</SelectItem>
                                    <SelectItem value="ml">Metro Linear (ml)</SelectItem>
                                    <SelectItem value="kg">Quilograma (kg)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Tipo de Venda</Label>
                            <Select value={saleType} onValueChange={setSaleType} disabled={isM2Unit}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="UNIT">Por Unidade/Caixa</SelectItem>
                                    <SelectItem value="AREA">Por Metro² (M²)</SelectItem>
                                    <SelectItem value="BOTH">Ambos</SelectItem>
                                </SelectContent>
                            </Select>
                            {isM2Unit && <p className="text-xs text-amber-600">Definido automaticamente para M².</p>}
                        </div>
                    </div>

                    {/* Cobertura — OBRIGATÓRIO se M2 */}
                    {needsCoverage && (
                        <div className="grid grid-cols-2 gap-4 bg-amber-50 p-3 rounded-lg border border-amber-200">
                            <div className="col-span-2 flex items-center gap-1.5 text-xs text-amber-700 font-medium mb-1">
                                <AlertCircle className="h-3.5 w-3.5" />
                                Dados obrigatórios para cálculo de M²
                            </div>
                            <div className="space-y-1.5">
                                <Label>M² por Caixa <span className="text-red-500">*</span></Label>
                                <Input
                                    type="number" step="0.0001" min="0.0001"
                                    value={boxCoverage} onChange={(e) => setBoxCoverage(e.target.value)}
                                    placeholder="Ex: 1.44"
                                    required={needsCoverage}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Peças por Caixa</Label>
                                <Input type="number" min="1" value={piecesPerBox} onChange={(e) => setPiecesPerBox(e.target.value)} placeholder="Ex: 6" />
                            </div>
                        </div>
                    )}

                    {/* Precificação */}
                    <div className="border-t pt-4">
                        <p className="text-sm font-medium text-gray-700 mb-3">Precificação</p>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label>{needsCoverage ? 'Custo da Caixa (R$)' : 'Custo de Compra (R$)'}</Label>
                                <Input type="number" step="0.01" min="0" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0,00" />
                                {costPerM2 !== null && costPerM2 > 0 && (
                                    <p className="text-xs text-blue-600 font-medium">= R$ {costPerM2.toFixed(2)}/m²</p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label>Markup (%)</Label>
                                <Input type="number" step="0.01" min="0" value={markup} onChange={(e) => setMarkup(e.target.value)} placeholder="Ex: 40" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-green-700">
                                    Preço Final {needsCoverage ? '(R$/m²)' : '(R$)'}
                                </Label>
                                <Input
                                    type="number" step="0.01" min="0"
                                    className="font-bold text-green-700 bg-green-50 border-green-200"
                                    value={finalPrice}
                                    onChange={(e) => setFinalPrice(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Campos opcionais — toggle */}
                    <div>
                        <Button
                            type="button" variant="ghost" size="sm"
                            className="w-full justify-between text-muted-foreground border border-dashed"
                            onClick={() => setShowExtras(v => !v)}
                        >
                            Dados Adicionais (opcional)
                            <ChevronDown className={`h-4 w-4 transition-transform ${showExtras ? 'rotate-180' : ''}`} />
                        </Button>

                        {showExtras && (
                            <div className="mt-3 space-y-4">
                            {/* Categoria e Marca */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Categoria</Label>
                                    <Select value={categoryId} onValueChange={setCategoryId}>
                                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Nenhuma</SelectItem>
                                            {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Marca</Label>
                                    <Select value={brandId} onValueChange={setBrandId}>
                                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Nenhuma</SelectItem>
                                            {brands.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Características */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Formato</Label>
                                    <Input value={format} onChange={(e) => setFormat(e.target.value)} placeholder="Ex: 60x120" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Cor</Label>
                                    <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Ex: Cinza" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Linha</Label>
                                    <Input value={line} onChange={(e) => setLine(e.target.value)} placeholder="Ex: Premium" />
                                </div>
                            </div>

                            {/* Dimensões */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Altura (cm)</Label>
                                    <Input type="number" step="0.1" min="0" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="Ex: 120" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Largura (cm)</Label>
                                    <Input type="number" step="0.1" min="0" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="Ex: 60" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>NCM</Label>
                                    <Input value={ncm} onChange={(e) => setNcm(e.target.value)} placeholder="Ex: 69072100" maxLength={10} />
                                </div>
                            </div>

                            {/* SKU */}
                            <div className="space-y-1.5">
                                <Label>SKU / Código do Fornecedor</Label>
                                <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Ex: REV-001-CZ" className="font-mono" />
                            </div>
                        </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => { resetForm(); onClose(); }} disabled={isLoading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading} className="bg-amber-600 hover:bg-amber-700">
                            {isLoading ? 'Salvando...' : 'Adicionar Produto'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
