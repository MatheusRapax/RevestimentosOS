'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
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
import { Switch } from '@/components/ui/switch';
import { HelpCircle, AlertCircle } from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

interface StockItem {
    id: string;
    name: string;
    description?: string;
    unit?: string;
    saleType?: string;
    sku?: string;
    minStock?: number;
    isActive: boolean;
    format?: string;
    line?: string;
    usage?: string;
    height?: number;
    width?: number;
    depth?: number;
    color?: string;
    boxCoverage?: number;
    piecesPerBox?: number;
    boxWeight?: number;
    palletBoxes?: number;
    palletWeight?: number;
    palletCoverage?: number;
    costCents?: number;
    priceCents?: number;
    supplierCode?: string;
    categoryId?: string;
    brandId?: string;
    markup?: number;
    manualPrice?: boolean;
}

interface Category { id: string; name: string; defaultMarkup?: number; }
interface Brand { id: string; name: string; defaultMarkup?: number; }

interface Props {
    open: boolean;
    item: StockItem | null;
    onClose: () => void;
    onSuccess: () => void;
}

const UNIT_OPTIONS = [
    { value: 'UN', label: 'Unidade (un)' },
    { value: 'M2', label: 'Metro Quadrado (m²)' },
    { value: 'CX', label: 'Caixa (cx)' },
    { value: 'PC', label: 'Peça (pç)' },
    { value: 'ML', label: 'Metro Linear (ml)' },
    { value: 'KG', label: 'Quilograma (kg)' },
];

// Normaliza o que estiver salvo (ex.: "m²", "cx") para o valor canônico do select.
function canonUnit(raw?: string): string {
    if (!raw) return 'UN';
    const u = raw.trim().toUpperCase();
    if (['M2', 'M²', 'M^2', 'MT2'].includes(u)) return 'M2';
    if (UNIT_OPTIONS.some((o) => o.value === u)) return u;
    if (u === 'UND' || u === 'UNID' || u === 'UNIDADE') return 'UN';
    if (u === 'PÇ' || u === 'PEÇA' || u === 'PECA') return 'PC';
    return u; // deixa o backend normalizar o resto
}

export default function EditStockItemDialog({ open, item, onClose, onSuccess }: Props) {
    const [formData, setFormData] = useState({
        name: '', description: '', unit: 'UN', saleType: 'UNIT', sku: '', minStock: 0,
        format: '', line: '', usage: '', height: '', width: '', depth: '', color: '',
        boxCoverage: '', piecesPerBox: '', boxWeight: '', palletBoxes: '', palletWeight: '',
        palletCoverage: '', costBox: '', costM2: '', priceBox: '', priceM2: '',
        supplierCode: '', categoryId: '', brandId: '', markup: '', manualPrice: false,
    });
    const [categories, setCategories] = useState<Category[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Popula quando o item muda
    useEffect(() => {
        if (!item) return;
        const cov = item.boxCoverage ?? 0;
        const boxCost = item.costCents ? item.costCents / 100 : NaN;
        const boxPrice = item.priceCents ? item.priceCents / 100 : NaN;
        const unit = canonUnit(item.unit);
        const saleType =
            item.saleType || (unit === 'M2' || cov > 0 ? 'AREA' : 'UNIT');

        setFormData({
            name: item.name,
            description: item.description || '',
            unit,
            saleType,
            sku: item.sku || '',
            minStock: item.minStock || 0,
            format: item.format || '',
            line: item.line || '',
            usage: item.usage || '',
            height: item.height?.toString() || '',
            width: item.width?.toString() || '',
            depth: item.depth?.toString() || '',
            color: item.color || '',
            boxCoverage: item.boxCoverage?.toString() || '',
            piecesPerBox: item.piecesPerBox?.toString() || '',
            boxWeight: item.boxWeight?.toString() || '',
            palletBoxes: item.palletBoxes?.toString() || '',
            palletWeight: item.palletWeight?.toString() || '',
            palletCoverage: item.palletCoverage?.toString() || '',
            costBox: !isNaN(boxCost) ? boxCost.toFixed(2) : '',
            costM2: !isNaN(boxCost) && cov > 0 ? (boxCost / cov).toFixed(2) : '',
            priceBox: !isNaN(boxPrice) ? boxPrice.toFixed(2) : '',
            priceM2: !isNaN(boxPrice) && cov > 0 ? (boxPrice / cov).toFixed(2) : '',
            supplierCode: item.supplierCode || '',
            categoryId: item.categoryId || '',
            brandId: item.brandId || '',
            markup: item.markup?.toString() || '',
            manualPrice: item.manualPrice || false,
        });
    }, [item]);

    useEffect(() => {
        if (open) {
            setError('');
            Promise.all([api.get('/catalogue/categories'), api.get('/catalogue/brands')])
                .then(([c, b]) => { setCategories(c.data); setBrands(b.data); })
                .catch((err) => console.error('Error fetching catalogue data:', err));
        }
    }, [open]);

    const isAreaSale =
        formData.unit === 'M2' || formData.saleType === 'AREA' || formData.saleType === 'BOTH';
    const coverage = parseFloat(formData.boxCoverage) || 0;
    const hasCoverage = coverage > 0;

    useEffect(() => {
        if (formData.unit === 'M2' && formData.saleType !== 'AREA') {
            setFormData((p) => ({ ...p, saleType: 'AREA' }));
        }
    }, [formData.unit]);

    // Cobertura mudou -> recalcula "por m²" a partir do "da caixa"
    useEffect(() => {
        if (!isAreaSale || !hasCoverage) return;
        const box = parseFloat(formData.costBox);
        if (!isNaN(box) && box > 0) setFormData((p) => ({ ...p, costM2: (box / coverage).toFixed(2) }));
        const pBox = parseFloat(formData.priceBox);
        if (formData.manualPrice && !isNaN(pBox) && pBox > 0) {
            setFormData((p) => ({ ...p, priceM2: (pBox / coverage).toFixed(2) }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.boxCoverage]);

    // Preço automático (custo da caixa + markup)
    useEffect(() => {
        if (formData.manualPrice) return;
        const boxCost = parseFloat(formData.costBox);
        if (isNaN(boxCost) || boxCost <= 0) return;

        let markup = 40.0;
        if (formData.markup && !isNaN(parseFloat(formData.markup))) markup = parseFloat(formData.markup);
        else if (formData.brandId) {
            const brand = brands.find((b) => b.id === formData.brandId);
            if (brand?.defaultMarkup) markup = brand.defaultMarkup;
            else if (formData.categoryId) {
                const cat = categories.find((c) => c.id === formData.categoryId);
                if (cat?.defaultMarkup) markup = cat.defaultMarkup;
            }
        } else if (formData.categoryId) {
            const cat = categories.find((c) => c.id === formData.categoryId);
            if (cat?.defaultMarkup) markup = cat.defaultMarkup;
        }
        const priceBox = boxCost * (1 + markup / 100);
        setFormData((p) => ({
            ...p,
            priceBox: priceBox.toFixed(2),
            priceM2: hasCoverage ? (priceBox / coverage).toFixed(2) : p.priceM2,
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        formData.costBox, formData.markup, formData.manualPrice,
        formData.categoryId, formData.brandId, formData.boxCoverage, categories, brands,
    ]);

    const setCostBox = (v: string) =>
        setFormData((p) => ({ ...p, costBox: v, costM2: hasCoverage && v ? (parseFloat(v) / coverage).toFixed(2) : p.costM2 }));
    const setCostM2 = (v: string) =>
        setFormData((p) => ({ ...p, costM2: v, costBox: hasCoverage && v ? (parseFloat(v) * coverage).toFixed(2) : p.costBox }));
    const setPriceBox = (v: string) =>
        setFormData((p) => ({ ...p, priceBox: v, priceM2: hasCoverage && v ? (parseFloat(v) / coverage).toFixed(2) : p.priceM2 }));
    const setPriceM2 = (v: string) =>
        setFormData((p) => ({ ...p, priceM2: v, priceBox: hasCoverage && v ? (parseFloat(v) * coverage).toFixed(2) : p.priceBox }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!item) return;
        setError('');

        if (isAreaSale && (!formData.boxCoverage || coverage <= 0)) {
            setError('Para produtos vendidos por m², informe o "m² por caixa".');
            return;
        }

        setIsLoading(true);
        try {
            const boxCost = parseFloat(formData.costBox);
            const boxPrice = parseFloat(formData.priceBox);

            const payload = {
                name: formData.name,
                description: formData.description || undefined,
                unit: formData.unit,
                saleType: formData.saleType,
                sku: formData.sku || undefined,
                minStock: formData.minStock,
                format: formData.format || undefined,
                line: formData.line || undefined,
                usage: formData.usage || undefined,
                height: formData.height ? parseFloat(formData.height) : undefined,
                width: formData.width ? parseFloat(formData.width) : undefined,
                depth: formData.depth ? parseFloat(formData.depth) : undefined,
                color: formData.color || undefined,
                boxCoverage: coverage || undefined,
                piecesPerBox: formData.piecesPerBox ? parseInt(formData.piecesPerBox) : undefined,
                boxWeight: formData.boxWeight ? parseFloat(formData.boxWeight) : undefined,
                palletBoxes: formData.palletBoxes ? parseInt(formData.palletBoxes) : undefined,
                palletWeight: formData.palletWeight ? parseFloat(formData.palletWeight) : undefined,
                palletCoverage: formData.palletCoverage ? parseFloat(formData.palletCoverage) : undefined,
                costCents: !isNaN(boxCost) && boxCost > 0 ? Math.round(boxCost * 100) : undefined,
                priceCents: !isNaN(boxPrice) && boxPrice > 0 ? Math.round(boxPrice * 100) : undefined,
                supplierCode: formData.supplierCode || undefined,
                categoryId: formData.categoryId || undefined,
                brandId: formData.brandId || undefined,
                markup: formData.markup ? parseFloat(formData.markup) : undefined,
                manualPrice: formData.manualPrice,
            };
            await api.patch(`/stock/${item.id}`, payload);
            onSuccess();
        } catch (err: any) {
            console.error('Error updating stock item:', err);
            setError(err.response?.data?.message || 'Erro ao atualizar item');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Produto</DialogTitle>
                    <DialogDescription>
                        Atualize os dados do produto. Para gerenciar quantidades, use as opções de entrada/saída de estoque.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">{error}</div>
                    )}

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-gray-900 border-b pb-2">Informações Básicas</h3>
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Nome do Produto *</Label>
                            <Input id="edit-name" value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Nome do produto" required minLength={3} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Descrição</Label>
                            <Input id="edit-description" value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descrição do produto" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-sku">SKU</Label>
                                <Input id="edit-sku" value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    placeholder="Código SKU" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-supplierCode">Ref. Fornecedor</Label>
                                <Input id="edit-supplierCode" value={formData.supplierCode}
                                    onChange={(e) => setFormData({ ...formData, supplierCode: e.target.value })}
                                    placeholder="Código do fornecedor" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Unidade de Medida *</Label>
                                <Select value={formData.unit}
                                    onValueChange={(val) => setFormData({ ...formData, unit: val })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {UNIT_OPTIONS.map((o) => (
                                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo de Venda</Label>
                                <Select value={formData.saleType}
                                    onValueChange={(val) => setFormData({ ...formData, saleType: val })}
                                    disabled={formData.unit === 'M2'}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="UNIT">Por Unidade/Caixa</SelectItem>
                                        <SelectItem value="AREA">Por Metro² (m²)</SelectItem>
                                        <SelectItem value="BOTH">Ambos</SelectItem>
                                    </SelectContent>
                                </Select>
                                {formData.unit === 'M2' && (
                                    <p className="text-xs text-amber-600">Definido automaticamente para m².</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Classification */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-gray-900 border-b pb-2">Classificação</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-format">Formato</Label>
                                <Input id="edit-format" value={formData.format}
                                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                                    placeholder="Ex: 60x60, 30x90" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-line">Linha</Label>
                                <Input id="edit-line" value={formData.line}
                                    onChange={(e) => setFormData({ ...formData, line: e.target.value })}
                                    placeholder="Ex: Mármore, Madeira" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-usage">Uso</Label>
                                <Input id="edit-usage" value={formData.usage}
                                    onChange={(e) => setFormData({ ...formData, usage: e.target.value })}
                                    placeholder="Ex: Piso, Parede" />
                            </div>
                        </div>
                    </div>

                    {/* Dimensões e Cores */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-gray-900 border-b pb-2">Dimensões e Cores (Ex: Louças e Metais)</h3>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-height">Altura (cm)</Label>
                                <Input id="edit-height" type="number" step="0.01" min="0" value={formData.height}
                                    onChange={(e) => setFormData({ ...formData, height: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-width">Largura (cm)</Label>
                                <Input id="edit-width" type="number" step="0.01" min="0" value={formData.width}
                                    onChange={(e) => setFormData({ ...formData, width: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-depth">Profundidade (cm)</Label>
                                <Input id="edit-depth" type="number" step="0.01" min="0" value={formData.depth}
                                    onChange={(e) => setFormData({ ...formData, depth: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-color">Cor</Label>
                                <Input id="edit-color" value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    {/* Packaging */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-gray-900 border-b pb-2">Informações de Embalagem</h3>
                        <div className={`grid grid-cols-2 gap-4 rounded-lg ${isAreaSale ? 'bg-amber-50 p-3 border border-amber-200' : ''}`}>
                            {isAreaSale && (
                                <div className="col-span-2 flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    Obrigatório para produtos vendidos por m²
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="edit-boxCoverage">
                                    m² por Caixa {isAreaSale && <span className="text-red-500">*</span>}
                                </Label>
                                <Input id="edit-boxCoverage" type="number" step="0.0001" min="0"
                                    value={formData.boxCoverage}
                                    onChange={(e) => setFormData({ ...formData, boxCoverage: e.target.value })}
                                    placeholder="Ex: 1.44" required={isAreaSale} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-piecesPerBox">
                                    Peças por Caixa {isAreaSale && <span className="text-red-500">*</span>}
                                </Label>
                                <Input id="edit-piecesPerBox" type="number" min="0"
                                    value={formData.piecesPerBox}
                                    onChange={(e) => setFormData({ ...formData, piecesPerBox: e.target.value })}
                                    placeholder="Ex: 8" required={isAreaSale} />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-boxWeight">Peso Caixa (kg)</Label>
                                <Input id="edit-boxWeight" type="number" step="0.01" min="0" value={formData.boxWeight}
                                    onChange={(e) => setFormData({ ...formData, boxWeight: e.target.value })} placeholder="Ex: 25.5" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-palletBoxes">Caixas/Palete</Label>
                                <Input id="edit-palletBoxes" type="number" min="0" value={formData.palletBoxes}
                                    onChange={(e) => setFormData({ ...formData, palletBoxes: e.target.value })} placeholder="Ex: 48" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-palletCoverage">m²/Palete</Label>
                                <Input id="edit-palletCoverage" type="number" step="0.01" min="0" value={formData.palletCoverage}
                                    onChange={(e) => setFormData({ ...formData, palletCoverage: e.target.value })} placeholder="Ex: 71.52" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-palletWeight">Peso Palete (kg)</Label>
                                <Input id="edit-palletWeight" type="number" step="0.01" min="0" value={formData.palletWeight}
                                    onChange={(e) => setFormData({ ...formData, palletWeight: e.target.value })} placeholder="Ex: 1200" />
                            </div>
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="font-medium text-gray-900">Precificação e Custos</h3>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full">
                                        <HelpCircle className="h-4 w-4 text-gray-400 hover:text-blue-600" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                    <div className="space-y-2">
                                        <h4 className="font-medium leading-none">Como o preço é calculado?</h4>
                                        <p className="text-sm text-muted-foreground">
                                            O sistema guarda sempre o <strong>valor da caixa/unidade</strong> e usa
                                            <strong> Custo + Markup</strong> (Produto → Marca → Categoria → Global 40%).
                                        </p>
                                        <p className="text-xs text-blue-600 mt-2">
                                            Em produtos por m², "Custo da Caixa" e "Custo por m²" se preenchem entre si.
                                        </p>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Categoria</Label>
                                <Select value={formData.categoryId}
                                    onValueChange={(val) => setFormData({ ...formData, categoryId: val })}>
                                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Marca</Label>
                                <Select value={formData.brandId}
                                    onValueChange={(val) => setFormData({ ...formData, brandId: val })}>
                                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        {brands.map((brand) => (
                                            <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {isAreaSale ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-costM2">Custo por m² (R$)</Label>
                                    <Input id="edit-costM2" type="number" step="0.01" min="0"
                                        value={formData.costM2} onChange={(e) => setCostM2(e.target.value)}
                                        placeholder="Ex: 76.20" disabled={!hasCoverage} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-costBox">Custo da Caixa (R$)</Label>
                                    <Input id="edit-costBox" type="number" step="0.01" min="0"
                                        value={formData.costBox} onChange={(e) => setCostBox(e.target.value)}
                                        placeholder="Ex: 157.73" />
                                    {!hasCoverage && (
                                        <p className="text-[10px] text-amber-600">Informe o "m² por caixa" para converter automaticamente.</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-costBox">Custo de Compra (R$)</Label>
                                    <Input id="edit-costBox" type="number" step="0.01" min="0"
                                        value={formData.costBox} onChange={(e) => setCostBox(e.target.value)}
                                        placeholder="Ex: 45.90" />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 items-start">
                            <div className="space-y-2">
                                <Label htmlFor="edit-markup">Markup (%)</Label>
                                <Input id="edit-markup" type="number" step="0.01" value={formData.markup}
                                    onChange={(e) => setFormData({ ...formData, markup: e.target.value })}
                                    placeholder="Override (opcional)" disabled={formData.manualPrice} />
                                <div className="flex items-center space-x-2 pt-1">
                                    <Switch id="edit-manual-price" checked={formData.manualPrice}
                                        onCheckedChange={(checked) => setFormData({ ...formData, manualPrice: checked })} />
                                    <Label htmlFor="edit-manual-price">Preço Manual</Label>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {isAreaSale ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label htmlFor="edit-priceM2" className="text-green-700">Preço Venda (R$/m²)</Label>
                                            <Input id="edit-priceM2" type="number" step="0.01" min="0"
                                                className="font-bold text-green-700 bg-green-50 border-green-200"
                                                value={formData.priceM2} onChange={(e) => setPriceM2(e.target.value)}
                                                disabled={!formData.manualPrice || !hasCoverage} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="edit-priceBox" className="text-green-700">Preço da Caixa (R$)</Label>
                                            <Input id="edit-priceBox" type="number" step="0.01" min="0"
                                                className="font-bold text-green-700 bg-green-50 border-green-200"
                                                value={formData.priceBox} onChange={(e) => setPriceBox(e.target.value)}
                                                disabled={!formData.manualPrice} />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <Label htmlFor="edit-priceBox" className="text-green-700">Preço Venda (R$)</Label>
                                        <Input id="edit-priceBox" type="number" step="0.01" min="0"
                                            className="font-bold text-green-700 bg-green-50 border-green-200"
                                            value={formData.priceBox} onChange={(e) => setPriceBox(e.target.value)}
                                            disabled={!formData.manualPrice} />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stock Control */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-gray-900 border-b pb-2">Controle de Estoque</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-minStock">Estoque Mínimo</Label>
                                <Input id="edit-minStock" type="number" min="0" value={formData.minStock}
                                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                                    placeholder="0" />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
