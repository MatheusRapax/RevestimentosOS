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
import { HelpCircle } from 'lucide-react';
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
    sku?: string;
    minStock?: number;
    isActive: boolean;
    // New fields
    format?: string;
    line?: string;
    usage?: string;
    boxCoverage?: number;
    piecesPerBox?: number;
    boxWeight?: number;
    palletBoxes?: number;
    palletWeight?: number;
    palletCoverage?: number;
    costCents?: number;
    priceCents?: number;
    supplierCode?: string;
    // Dynamic Pricing
    categoryId?: string;
    brandId?: string;
    markup?: number;
    manualPrice?: boolean;
}

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
    item: StockItem | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditStockItemDialog({ open, item, onClose, onSuccess }: Props) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        unit: '',
        sku: '',
        minStock: 0,
        // New fields
        format: '',
        line: '',
        usage: '',
        boxCoverage: '',
        piecesPerBox: '',
        boxWeight: '',
        palletBoxes: '',
        palletWeight: '',
        palletCoverage: '',
        costCents: '',
        priceCents: '',
        supplierCode: '',
        // Dynamic Pricing
        categoryId: '',
        brandId: '',
        markup: '',
        manualPrice: false,
    });
    const [categories, setCategories] = useState<Category[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Populate form when item changes
    useEffect(() => {
        if (item) {
            setFormData({
                name: item.name,
                description: item.description || '',
                unit: item.unit || '',
                sku: item.sku || '',
                minStock: item.minStock || 0,
                format: item.format || '',
                line: item.line || '',
                usage: item.usage || '',
                boxCoverage: item.boxCoverage?.toString() || '',
                piecesPerBox: item.piecesPerBox?.toString() || '',
                boxWeight: item.boxWeight?.toString() || '',
                palletBoxes: item.palletBoxes?.toString() || '',
                palletWeight: item.palletWeight?.toString() || '',
                palletCoverage: item.palletCoverage?.toString() || '',
                costCents: item.costCents ? (item.costCents / 100).toFixed(2) : '',
                priceCents: item.priceCents ? (item.priceCents / 100).toFixed(2) : '',
                supplierCode: item.supplierCode || '',
                categoryId: item.categoryId || '',
                brandId: item.brandId || '',
                markup: item.markup?.toString() || '',
                manualPrice: item.manualPrice || false,
            });
        }
    }, [item]);

    useEffect(() => {
        if (open) {
            const fetchData = async () => {
                try {
                    const [catsRes, brandsRes] = await Promise.all([
                        api.get('/catalogue/categories'),
                        api.get('/catalogue/brands')
                    ]);
                    setCategories(catsRes.data);
                    setBrands(brandsRes.data);
                } catch (err) {
                    console.error('Error fetching catalogue data:', err);
                }
            };
            fetchData();
        }
    }, [open]);

    // Price Calculation Logic
    useEffect(() => {
        if (!formData.manualPrice && formData.costCents) {
            const cost = parseFloat(formData.costCents);
            if (!isNaN(cost) && cost > 0) {
                let markup = 40.0; // Default Global Markup (fallback)

                // 1. Product Markup Override
                if (formData.markup && !isNaN(parseFloat(formData.markup))) {
                    markup = parseFloat(formData.markup);
                }
                // 2. Brand Markup
                else if (formData.brandId) {
                    const brand = brands.find(b => b.id === formData.brandId);
                    if (brand?.defaultMarkup) markup = brand.defaultMarkup;
                    // 3. Category Markup (fallback if Brand doesn't have one)
                    else if (formData.categoryId) {
                        const category = categories.find(c => c.id === formData.categoryId);
                        if (category?.defaultMarkup) markup = category.defaultMarkup;
                    }
                }
                // 3. Category Markup (if no Brand selected)
                else if (formData.categoryId) {
                    const category = categories.find(c => c.id === formData.categoryId);
                    if (category?.defaultMarkup) markup = category.defaultMarkup;
                }

                const price = cost * (1 + markup / 100);
                setFormData(prev => ({
                    ...prev,
                    priceCents: price.toFixed(2)
                }));
            }
        }
    }, [
        formData.costCents,
        formData.categoryId,
        formData.brandId,
        formData.markup,
        formData.manualPrice,
        categories,
        brands
    ]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!item) return;

        setError('');
        setIsLoading(true);

        try {
            const payload = {
                name: formData.name,
                description: formData.description || undefined,
                unit: formData.unit || undefined,
                sku: formData.sku || undefined,
                minStock: formData.minStock,
                format: formData.format || undefined,
                line: formData.line || undefined,
                usage: formData.usage || undefined,
                boxCoverage: formData.boxCoverage ? parseFloat(formData.boxCoverage) : undefined,
                piecesPerBox: formData.piecesPerBox ? parseInt(formData.piecesPerBox) : undefined,
                boxWeight: formData.boxWeight ? parseFloat(formData.boxWeight) : undefined,
                palletBoxes: formData.palletBoxes ? parseInt(formData.palletBoxes) : undefined,
                palletWeight: formData.palletWeight ? parseFloat(formData.palletWeight) : undefined,
                palletCoverage: formData.palletCoverage ? parseFloat(formData.palletCoverage) : undefined,
                costCents: formData.costCents ? Math.round(parseFloat(formData.costCents) * 100) : undefined,
                priceCents: formData.priceCents ? Math.round(parseFloat(formData.priceCents) * 100) : undefined,
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
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-gray-900 border-b pb-2">Informações Básicas</h3>

                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Nome do Produto *</Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Nome do produto"
                                required
                                minLength={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Descrição</Label>
                            <Input
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descrição do produto"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-sku">SKU</Label>
                                <Input
                                    id="edit-sku"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    placeholder="Código SKU"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-supplierCode">Ref. Fornecedor</Label>
                                <Input
                                    id="edit-supplierCode"
                                    value={formData.supplierCode}
                                    onChange={(e) => setFormData({ ...formData, supplierCode: e.target.value })}
                                    placeholder="Código do fornecedor"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-unit">Unidade</Label>
                                <Input
                                    id="edit-unit"
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    placeholder="Ex: caixa, m²"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Product Classification */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-gray-900 border-b pb-2">Classificação</h3>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-format">Formato</Label>
                                <Input
                                    id="edit-format"
                                    value={formData.format}
                                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                                    placeholder="Ex: 60x60, 30x90"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-line">Linha</Label>
                                <Input
                                    id="edit-line"
                                    value={formData.line}
                                    onChange={(e) => setFormData({ ...formData, line: e.target.value })}
                                    placeholder="Ex: Mármore, Madeira"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-usage">Uso</Label>
                                <Input
                                    id="edit-usage"
                                    value={formData.usage}
                                    onChange={(e) => setFormData({ ...formData, usage: e.target.value })}
                                    placeholder="Ex: Piso, Parede"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Packaging Info */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-gray-900 border-b pb-2">Informações de Embalagem</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-boxCoverage">m² por Caixa</Label>
                                <Input
                                    id="edit-boxCoverage"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.boxCoverage}
                                    onChange={(e) => setFormData({ ...formData, boxCoverage: e.target.value })}
                                    placeholder="Ex: 1.44"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-piecesPerBox">Peças por Caixa</Label>
                                <Input
                                    id="edit-piecesPerBox"
                                    type="number"
                                    min="0"
                                    value={formData.piecesPerBox}
                                    onChange={(e) => setFormData({ ...formData, piecesPerBox: e.target.value })}
                                    placeholder="Ex: 8"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-boxWeight">Peso Caixa (kg)</Label>
                                <Input
                                    id="edit-boxWeight"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.boxWeight}
                                    onChange={(e) => setFormData({ ...formData, boxWeight: e.target.value })}
                                    placeholder="Ex: 25.5"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-palletBoxes">Caixas/Palete</Label>
                                <Input
                                    id="edit-palletBoxes"
                                    type="number"
                                    min="0"
                                    value={formData.palletBoxes}
                                    onChange={(e) => setFormData({ ...formData, palletBoxes: e.target.value })}
                                    placeholder="Ex: 48"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-palletCoverage">m²/Palete</Label>
                                <Input
                                    id="edit-palletCoverage"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.palletCoverage}
                                    onChange={(e) => setFormData({ ...formData, palletCoverage: e.target.value })}
                                    placeholder="Ex: 71.52"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-palletWeight">Peso Palete (kg)</Label>
                                <Input
                                    id="edit-palletWeight"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.palletWeight}
                                    onChange={(e) => setFormData({ ...formData, palletWeight: e.target.value })}
                                    placeholder="Ex: 1200"
                                />
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
                                            O sistema usa o <strong>Custo</strong> + <strong>Markup</strong>.
                                            A prioridade do Markup é:
                                        </p>
                                        <ul className="text-xs list-disc pl-4 space-y-1 text-muted-foreground">
                                            <li><strong>Produto:</strong> Se preenchido aqui.</li>
                                            <li><strong>Marca:</strong> Se a marca tiver markup.</li>
                                            <li><strong>Categoria:</strong> Se a categ. tiver markup.</li>
                                            <li><strong>Global:</strong> Padrão do sistema (40%).</li>
                                        </ul>
                                        <p className="text-xs text-blue-600 mt-2">
                                            Ative "Preço Manual" para ignorar essas regras.
                                        </p>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Categoria</Label>
                                <Select
                                    value={formData.categoryId}
                                    onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(cat => (
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
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {brands.map(brand => (
                                            <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-costCents">Custo (R$)</Label>
                                <Input
                                    id="edit-costCents"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.costCents}
                                    onChange={(e) => setFormData({ ...formData, costCents: e.target.value })}
                                    placeholder="Ex: 45.90"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 items-end">
                            <div className="space-y-2">
                                <Label htmlFor="edit-markup">Markup (%)</Label>
                                <Input
                                    id="edit-markup"
                                    type="number"
                                    step="0.01"
                                    value={formData.markup}
                                    onChange={(e) => setFormData({ ...formData, markup: e.target.value })}
                                    placeholder="Override (opcional)"
                                    disabled={formData.manualPrice}
                                />
                            </div>
                            <div className="flex items-center space-x-2 pb-3">
                                <Switch
                                    id="edit-manual-price"
                                    checked={formData.manualPrice}
                                    onCheckedChange={(checked) => setFormData({ ...formData, manualPrice: checked })}
                                />
                                <Label htmlFor="edit-manual-price">Preço Manual</Label>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-priceCents">Preço Venda (R$)</Label>
                                <Input
                                    id="edit-priceCents"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.priceCents}
                                    onChange={(e) => setFormData({ ...formData, priceCents: e.target.value })}
                                    placeholder="Ex: 89.90"
                                    disabled={!formData.manualPrice}
                                    className={!formData.manualPrice ? "bg-gray-50" : ""}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stock Control */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-gray-900 border-b pb-2">Controle de Estoque</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-minStock">Estoque Mínimo</Label>
                                <Input
                                    id="edit-minStock"
                                    type="number"
                                    min="0"
                                    value={formData.minStock}
                                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
