'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Sparkles, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Product {
    id: string;
    name: string;
    unit?: string;
    saleType?: string;
    boxCoverage?: number;
    piecesPerBox?: number;
    costCents?: number;
    priceCents?: number;
    markup?: number;
    format?: string;
    color?: string;
    line?: string;
    sku?: string;
    ncm?: string;
    height?: number;
    width?: number;
    isAdhoc?: boolean;
}

interface PromoteAdhocDialogProps {
    open: boolean;
    product: Product | null;
    onOpenChange: (open: boolean) => void;
    onPromoted: (updatedProduct: Product) => void;
}

export function PromoteAdhocDialog({
    open,
    product,
    onOpenChange,
    onPromoted,
}: PromoteAdhocDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    // Editable fields pre-populated from product
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('un');
    const [saleType, setSaleType] = useState('UNIT');
    const [boxCoverage, setBoxCoverage] = useState('');
    const [piecesPerBox, setPiecesPerBox] = useState('');
    const [cost, setCost] = useState('');
    const [markup, setMarkup] = useState('');
    const [price, setPrice] = useState('');
    const [format, setFormat] = useState('');
    const [color, setColor] = useState('');
    const [line, setLine] = useState('');
    const [sku, setSku] = useState('');
    const [ncm, setNcm] = useState('');

    const isM2 = unit === 'm2' || unit === 'M2' || saleType === 'AREA' || saleType === 'BOTH';
    const coverageNum = parseFloat(boxCoverage) || 0;
    const costNum = parseFloat(cost) || 0;
    const costPerM2 = isM2 && coverageNum > 0 ? costNum / coverageNum : null;

    useEffect(() => {
        if (product && open) {
            setName(product.name ?? '');
            setUnit(product.unit ?? 'un');
            setSaleType(product.saleType ?? 'UNIT');
            setBoxCoverage(product.boxCoverage ? String(product.boxCoverage) : '');
            setPiecesPerBox(product.piecesPerBox ? String(product.piecesPerBox) : '');
            setCost(product.costCents ? String(product.costCents / 100) : '');
            setMarkup(product.markup ? String(product.markup) : '');
            setPrice(product.priceCents ? String(product.priceCents / 100) : '');
            setFormat(product.format ?? '');
            setColor(product.color ?? '');
            setLine(product.line ?? '');
            setSku(product.sku ?? '');
            setNcm(product.ncm ?? '');
        }
    }, [product, open]);

    const handlePromote = async () => {
        if (!product) return;

        if (!name.trim()) {
            toast.error('O nome do produto é obrigatório.');
            return;
        }
        if (isM2 && !boxCoverage) {
            toast.error('Para produtos por M², a cobertura (m²/cx) é obrigatória.');
            return;
        }

        setIsLoading(true);
        try {
            const payload: any = {
                isAdhoc: false, // Promote to catalog
                name: name.trim(),
                unit,
                saleType,
            };

            if (boxCoverage) payload.boxCoverage = parseFloat(boxCoverage);
            if (piecesPerBox) payload.piecesPerBox = parseInt(piecesPerBox, 10);
            if (cost) {
                payload.costCents = Math.round(costNum * 100);
            }
            if (markup) payload.markup = parseFloat(markup);
            if (price) payload.priceCents = Math.round(parseFloat(price) * 100);
            if (format.trim()) payload.format = format.trim();
            if (color.trim()) payload.color = color.trim();
            if (line.trim()) payload.line = line.trim();
            if (sku.trim()) payload.sku = sku.trim();
            if (ncm.trim()) payload.ncm = ncm.trim();

            const res = await api.patch(`/stock/products/${product.id}`, payload);
            toast.success(`"${name}" promovido ao catálogo com sucesso!`);
            onPromoted(res.data);
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao promover produto.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!product) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        Produto Extraordinário
                    </DialogTitle>
                    <DialogDescription>
                        Este produto foi criado de forma avulsa para um orçamento específico.
                    </DialogDescription>
                </DialogHeader>

                {/* Banner explicativo */}
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                        <div className="text-sm text-amber-800">
                            <p className="font-semibold mb-1">O que é um produto avulso?</p>
                            <p>
                                Produtos avulsos são criados rapidamente durante um orçamento e ficam{' '}
                                <strong>ocultos do catálogo principal</strong>. Eles não aparecem nas buscas nem
                                em novos orçamentos.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 pt-1 border-t border-amber-200">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-amber-800">
                            Complete os dados abaixo e clique em <strong>Ativar no Catálogo</strong> para que
                            este produto apareça nas buscas de novos orçamentos como qualquer outro produto.
                        </p>
                    </div>
                </div>

                {/* Formulário */}
                <div className="space-y-4 mt-2">
                    {/* Nome */}
                    <div className="space-y-1.5">
                        <Label>Nome do Produto <span className="text-red-500">*</span></Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>

                    {/* Unidade + Tipo de Venda */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Unidade <span className="text-red-500">*</span></Label>
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
                            <Select value={saleType} onValueChange={setSaleType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="UNIT">Por Unidade/Caixa</SelectItem>
                                    <SelectItem value="AREA">Por Metro² (M²)</SelectItem>
                                    <SelectItem value="BOTH">Ambos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Cobertura M2 */}
                    {isM2 && (
                        <div className="grid grid-cols-2 gap-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <div className="col-span-2 text-xs text-blue-700 font-medium">
                                Necessário para calcular m² corretamente
                            </div>
                            <div className="space-y-1.5">
                                <Label>M² por Caixa <span className="text-red-500">*</span></Label>
                                <Input
                                    type="number" step="0.0001" min="0.0001"
                                    value={boxCoverage}
                                    onChange={(e) => setBoxCoverage(e.target.value)}
                                    placeholder="Ex: 1.44"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Peças por Caixa</Label>
                                <Input type="number" min="1" value={piecesPerBox} onChange={(e) => setPiecesPerBox(e.target.value)} placeholder="Ex: 6" />
                            </div>
                        </div>
                    )}

                    {/* Precificação */}
                    <div className="grid grid-cols-3 gap-4 border-t pt-4">
                        <div className="space-y-1.5">
                            <Label>{isM2 ? 'Custo da Caixa (R$)' : 'Custo (R$)'}</Label>
                            <Input type="number" step="0.01" min="0" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0,00" />
                            {costPerM2 !== null && costPerM2 > 0 && (
                                <p className="text-xs text-blue-600">= R$ {costPerM2.toFixed(2)}/m²</p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label>Markup (%)</Label>
                            <Input type="number" step="0.01" value={markup} onChange={(e) => setMarkup(e.target.value)} placeholder="Ex: 40" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-green-700">Preço Venda {isM2 ? '(R$/m²)' : '(R$)'}</Label>
                            <Input
                                type="number" step="0.01"
                                className="font-bold text-green-700 bg-green-50 border-green-200"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Detalhes extras colapsível */}
                    <div>
                        <button
                            type="button"
                            onClick={() => setShowDetails(v => !v)}
                            className="w-full flex items-center justify-between text-sm text-gray-500 border border-dashed rounded-md px-3 py-2 hover:bg-gray-50 transition-colors"
                        >
                            <span>Detalhes adicionais (Formato, Cor, SKU, NCM...)</span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                        </button>

                        {showDetails && (
                            <div className="mt-3 grid grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label>Formato</Label>
                                    <Input value={format} onChange={(e) => setFormat(e.target.value)} placeholder="60x120" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Cor</Label>
                                    <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Cinza" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Linha</Label>
                                    <Input value={line} onChange={(e) => setLine(e.target.value)} placeholder="Premium" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>SKU</Label>
                                    <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="REV-001" className="font-mono" />
                                </div>
                                <div className="space-y-1.5 col-span-2">
                                    <Label>NCM</Label>
                                    <Input value={ncm} onChange={(e) => setNcm(e.target.value)} placeholder="69072100" maxLength={10} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="mt-4 flex gap-2 flex-row justify-end">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Fechar
                    </Button>
                    <Button
                        onClick={handlePromote}
                        disabled={isLoading || !name.trim()}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        <Sparkles className="h-4 w-4 mr-2" />
                        {isLoading ? 'Ativando...' : 'Ativar no Catálogo'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
