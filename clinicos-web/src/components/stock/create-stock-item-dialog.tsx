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

interface Category {
    id: string;
    name: string;
    defaultMarkup?: number;
}

interface Brand {
    id: string;
    name: string;
    defaultMarkup?: number;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

// Unidades canônicas (o que é gravado no banco). O backend também normaliza,
// mas mandamos já no formato certo.
const UNIT_OPTIONS = [
    { value: 'UN', label: 'Unidade (un)' },
    { value: 'M2', label: 'Metro Quadrado (m²)' },
    { value: 'CX', label: 'Caixa (cx)' },
    { value: 'PC', label: 'Peça (pç)' },
    { value: 'ML', label: 'Metro Linear (ml)' },
    { value: 'KG', label: 'Quilograma (kg)' },
];

const emptyForm = {
    name: '',
    description: '',
    unit: 'UN',
    saleType: 'UNIT',
    sku: '',
    minStock: 0,
    format: '',
    line: '',
    usage: '',
    height: '',
    width: '',
    depth: '',
    color: '',
    boxCoverage: '',
    piecesPerBox: '',
    boxWeight: '',
    palletBoxes: '',
    palletWeight: '',
    palletCoverage: '',
    // custo/preço SEMPRE persistidos como valor da CAIXA/UNIDADE.
    // Na tela mantemos os dois: "da caixa" e "por m²" (quando faz sentido).
    costBox: '',
    costM2: '',
    priceBox: '',
    priceM2: '',
    supplierCode: '',
    categoryId: '',
    brandId: '',
    markup: '',
    manualPrice: false,
};

export default function CreateStockItemDialog({ open, onClose, onSuccess }: Props) {
    const [formData, setFormData] = useState({ ...emptyForm });
    const [categories, setCategories] = useState<Category[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const resetForm = () => setFormData({ ...emptyForm });

    useEffect(() => {
        if (open) {
            resetForm();
            setError('');
            Promise.all([
                api.get('/catalogue/categories'),
                api.get('/catalogue/brands'),
            ])
                .then(([catsRes, brandsRes]) => {
                    setCategories(catsRes.data);
                    setBrands(brandsRes.data);
                })
                .catch((err) => console.error('Error fetching catalogue data:', err));
        }
    }, [open]);

    // --- Derivados ---
    const isAreaSale =
        formData.unit === 'M2' ||
        formData.saleType === 'AREA' ||
        formData.saleType === 'BOTH';
    const coverage = parseFloat(formData.boxCoverage) || 0;
    const hasCoverage = coverage > 0;

    // Unidade M² => trava tipo de venda em AREA
    useEffect(() => {
        if (formData.unit === 'M2' && formData.saleType !== 'AREA') {
            setFormData((p) => ({ ...p, saleType: 'AREA' }));
        }
    }, [formData.unit]);

    // Se mudar a cobertura, recalcula o "custo por m²" a partir do "custo da caixa" (fonte da verdade)
    useEffect(() => {
        if (!isAreaSale || !hasCoverage) return;
        const box = parseFloat(formData.costBox);
        if (!isNaN(box) && box > 0) {
            setFormData((p) => ({ ...p, costM2: (box / coverage).toFixed(2) }));
        }
        const pBox = parseFloat(formData.priceBox);
        if (formData.manualPrice && !isNaN(pBox) && pBox > 0) {
            setFormData((p) => ({ ...p, priceM2: (pBox / coverage).toFixed(2) }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.boxCoverage]);

    // --- Cálculo automático de preço (custo da caixa + markup) ---
    useEffect(() => {
        if (formData.manualPrice) return;
        const boxCost = parseFloat(formData.costBox);
        if (isNaN(boxCost) || boxCost <= 0) {
            setFormData((p) => ({ ...p, priceBox: '', priceM2: '' }));
            return;
        }

        let markup = 40.0; // Global fallback
        if (formData.markup && !isNaN(parseFloat(formData.markup))) {
            markup = parseFloat(formData.markup);
        } else if (formData.brandId) {
            const brand = brands.find((b) => b.id === formData.brandId);
            if (brand?.defaultMarkup) markup = brand.defaultMarkup;
            else if (formData.categoryId) {
                const category = categories.find((c) => c.id === formData.categoryId);
                if (category?.defaultMarkup) markup = category.defaultMarkup;
            }
        } else if (formData.categoryId) {
            const category = categories.find((c) => c.id === formData.categoryId);
            if (category?.defaultMarkup) markup = category.defaultMarkup;
        }

        const priceBox = boxCost * (1 + markup / 100);
        setFormData((p) => ({
            ...p,
            priceBox: priceBox.toFixed(2),
            priceM2: hasCoverage ? (priceBox / coverage).toFixed(2) : '',
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        formData.costBox,
        formData.markup,
        formData.manualPrice,
        formData.categoryId,
        formData.brandId,
        formData.boxCoverage,
        categories,
        brands,
    ]);

    // --- Handlers de custo/preço com sincronização caixa <-> m² ---
    const setCostBox = (v: string) =>
        setFormData((p) => ({
            ...p,
            costBox: v,
            costM2: hasCoverage && v ? (parseFloat(v) / coverage).toFixed(2) : p.costM2,
        }));
    const setCostM2 = (v: string) =>
        setFormData((p) => ({
            ...p,
            costM2: v,
            costBox: hasCoverage && v ? (parseFloat(v) * coverage).toFixed(2) : p.costBox,
        }));
    const setPriceBox = (v: string) =>
        setFormData((p) => ({
            ...p,
            priceBox: v,
            priceM2: hasCoverage && v ? (parseFloat(v) / coverage).toFixed(2) : p.priceM2,
        }));
    const setPriceM2 = (v: string) =>
        setFormData((p) => ({
            ...p,
            priceM2: v,
            priceBox: hasCoverage && v ? (parseFloat(v) * coverage).toFixed(2) : p.priceBox,
        }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (isAreaSale && (!formData.boxCoverage || coverage <= 0)) {
            setError('Para produtos vendidos por m², informe o "m² por caixa".');
            return;
        }
        if (isAreaSale && !formData.piecesPerBox) {
            setError('Para produtos vendidos por m², informe as "peças por caixa".');
            return;
        }

        setIsLoading(true);
        try {
            // Storage: SEMPRE valor da caixa/unidade.
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
            await api.post('/stock', payload);
            onSuccess();
            resetForm();
        } catch (err: any) {
            console.error('Error creating stock item:', err);
            setError(err.response?.data?.message || 'Erro ao criar item');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Novo Produto</DialogTitle>
                    <DialogDescription>
                        Preencha os dados para adicionar um novo produto ao catálogo
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-gray-900 border-b pb-2">Informações Básicas</h3>

                        <div className="space-y-2">
                            <Label htmlFor="create-name">Nome do Produto *</Label>
                            <Input
                                id="create-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Nome do produto"
                                required
                                minLength={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="create-description">Descrição</Label>
                            <Input
                                id="create-description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descrição do produto"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-sku">SKU</Label>
                                <Input
                                    id="create-sku"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    placeholder="Código SKU"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-supplierCode">Ref. Fornecedor</Label>
                                <Input
                                    id="create-supplierCode"
                                    value={formData.supplierCode}
                                    onChange={(e) => setFormData({ ...formData, supplierCode: e.target.value })}
                                    placeholder="Código do fornecedor"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Unidade de Medida *</Label>
                                <Select
                                    value={formData.unit}
                                    onValueChange={(val) => setFormData({ ...formData, unit: val })}
                                >
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
                                <Select
                                    value={formData.saleType}
                                    onValueChange={(val) => setFormData({ ...formData, saleType: val })}
                                    disabled={formData.unit === 'M2'}
                                >
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

                    {/* Product Classification */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-gray-900 border-b pb-2">Classificação</h3>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-format">Formato</Label>
                                <Input
                                    id="create-format"
                                    value={formData.format}
                                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                                    placeholder="Ex: 60x60, 30x90"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-line">Linha</Label>
                                <Input
                                    id="create-line"
                                    value={formData.line}
                                    onChange={(e) => setFormData({ ...formData, line: e.target.value })}
                                    placeholder="Ex: Mármore, Madeira"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-usage">Uso</Label>
                                <Input
                                    id="create-usage"
                                    value={formData.usage}
                                    onChange={(e) => setFormData({ ...formData, usage: e.target.value })}
                                    placeholder="Ex: Piso, Parede"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Dimensões e Cores */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-gray-900 border-b pb-2">Dimensões e Cores (Ex: Louças e Metais)</h3>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-height">Altura (cm)</Label>
                                <Input id="create-height" type="number" step="0.01" min="0"
                                    value={formData.height}
                                    onChange={(e) => setFormData({ ...formData, height: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-width">Largura (cm)</Label>
                                <Input id="create-width" type="number" step="0.01" min="0"
                                    value={formData.width}
                                    onChange={(e) => setFormData({ ...formData, width: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-depth">Profundidade (cm)</Label>
                                <Input id="create-depth" type="number" step="0.01" min="0"
                                    value={formData.depth}
                                    onChange={(e) => setFormData({ ...formData, depth: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-color">Cor</Label>
                                <Input id="create-color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    {/* Packaging Info */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-gray-900 border-b pb-2">Informações de Embalagem</h3>

                        <div
                            className={`grid grid-cols-2 gap-4 rounded-lg ${isAreaSale ? 'bg-amber-50 p-3 border border-amber-200' : ''}`}
                        >
                            {isAreaSale && (
                                <div className="col-span-2 flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    Obrigatório para produtos vendidos por m²
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="create-boxCoverage">
                                    m² por Caixa {isAreaSale && <span className="text-red-500">*</span>}
                                </Label>
                                <Input
                                    id="create-boxCoverage"
                                    type="number" step="0.0001" min="0"
                                    value={formData.boxCoverage}
                                    onChange={(e) => setFormData({ ...formData, boxCoverage: e.target.value })}
                                    placeholder="Ex: 1.44"
                                    required={isAreaSale}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-piecesPerBox">
                                    Peças por Caixa {isAreaSale && <span className="text-red-500">*</span>}
                                </Label>
                                <Input
                                    id="create-piecesPerBox"
                                    type="number" min="0"
                                    value={formData.piecesPerBox}
                                    onChange={(e) => setFormData({ ...formData, piecesPerBox: e.target.value })}
                                    placeholder="Ex: 8"
                                    required={isAreaSale}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="create-boxWeight">Peso Caixa (kg)</Label>
                                <Input id="create-boxWeight" type="number" step="0.01" min="0"
                                    value={formData.boxWeight}
                                    onChange={(e) => setFormData({ ...formData, boxWeight: e.target.value })}
                                    placeholder="Ex: 25.5" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-palletBoxes">Caixas/Palete</Label>
                                <Input id="create-palletBoxes" type="number" min="0"
                                    value={formData.palletBoxes}
                                    onChange={(e) => setFormData({ ...formData, palletBoxes: e.target.value })}
                                    placeholder="Ex: 48" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-palletCoverage">m²/Palete</Label>
                                <Input id="create-palletCoverage" type="number" step="0.01" min="0"
                                    value={formData.palletCoverage}
                                    onChange={(e) => setFormData({ ...formData, palletCoverage: e.target.value })}
                                    placeholder="Ex: 71.52" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="create-palletWeight">Peso Palete (kg)</Label>
                                <Input id="create-palletWeight" type="number" step="0.01" min="0"
                                    value={formData.palletWeight}
                                    onChange={(e) => setFormData({ ...formData, palletWeight: e.target.value })}
                                    placeholder="Ex: 1200" />
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Pricing & Costs */}
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
                                            <strong> Custo + Markup</strong>. Prioridade do Markup:
                                        </p>
                                        <ul className="text-xs list-disc pl-4 space-y-1 text-muted-foreground">
                                            <li><strong>Produto</strong> → <strong>Marca</strong> → <strong>Categoria</strong> → <strong>Global (40%)</strong>.</li>
                                        </ul>
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
                                <Select
                                    value={formData.categoryId}
                                    onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
                                >
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
                                <Select
                                    value={formData.brandId}
                                    onValueChange={(val) => setFormData({ ...formData, brandId: val })}
                                >
                                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        {brands.map((brand) => (
                                            <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Custo */}
                        {isAreaSale ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="create-costM2">Custo por m² (R$)</Label>
                                    <Input
                                        id="create-costM2"
                                        type="number" step="0.01" min="0"
                                        value={formData.costM2}
                                        onChange={(e) => setCostM2(e.target.value)}
                                        placeholder="Ex: 76.20"
                                        disabled={!hasCoverage}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="create-costBox">Custo da Caixa (R$)</Label>
                                    <Input
                                        id="create-costBox"
                                        type="number" step="0.01" min="0"
                                        value={formData.costBox}
                                        onChange={(e) => setCostBox(e.target.value)}
                                        placeholder="Ex: 157.73"
                                    />
                                    {!hasCoverage && (
                                        <p className="text-[10px] text-amber-600">Informe o "m² por caixa" para converter automaticamente.</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="create-costBox">Custo de Compra (R$)</Label>
                                    <Input
                                        id="create-costBox"
                                        type="number" step="0.01" min="0"
                                        value={formData.costBox}
                                        onChange={(e) => setCostBox(e.target.value)}
                                        placeholder="Ex: 45.90"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Markup + Manual + Preço */}
                        <div className="grid grid-cols-2 gap-4 items-start">
                            <div className="space-y-2">
                                <Label htmlFor="create-markup">Markup (%)</Label>
                                <Input
                                    id="create-markup"
                                    type="number" step="0.01"
                                    value={formData.markup}
                                    onChange={(e) => setFormData({ ...formData, markup: e.target.value })}
                                    placeholder="Override (opcional)"
                                    disabled={formData.manualPrice}
                                />
                                <div className="flex items-center space-x-2 pt-1">
                                    <Switch
                                        id="manual-price"
                                        checked={formData.manualPrice}
                                        onCheckedChange={(checked) => setFormData({ ...formData, manualPrice: checked })}
                                    />
                                    <Label htmlFor="manual-price">Preço Manual</Label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {isAreaSale ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label htmlFor="create-priceM2" className="text-green-700">Preço Venda (R$/m²)</Label>
                                            <Input
                                                id="create-priceM2"
                                                type="number" step="0.01" min="0"
                                                className="font-bold text-green-700 bg-green-50 border-green-200"
                                                value={formData.priceM2}
                                                onChange={(e) => setPriceM2(e.target.value)}
                                                disabled={!formData.manualPrice || !hasCoverage}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="create-priceBox" className="text-green-700">Preço da Caixa (R$)</Label>
                                            <Input
                                                id="create-priceBox"
                                                type="number" step="0.01" min="0"
                                                className="font-bold text-green-700 bg-green-50 border-green-200"
                                                value={formData.priceBox}
                                                onChange={(e) => setPriceBox(e.target.value)}
                                                disabled={!formData.manualPrice}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <Label htmlFor="create-priceBox" className="text-green-700">Preço Venda (R$)</Label>
                                        <Input
                                            id="create-priceBox"
                                            type="number" step="0.01" min="0"
                                            className="font-bold text-green-700 bg-green-50 border-green-200"
                                            value={formData.priceBox}
                                            onChange={(e) => setPriceBox(e.target.value)}
                                            disabled={!formData.manualPrice}
                                        />
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
                                <Label htmlFor="create-minStock">Estoque Mínimo</Label>
                                <Input
                                    id="create-minStock"
                                    type="number" min="0"
                                    value={formData.minStock}
                                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Criando...' : 'Criar Produto'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
