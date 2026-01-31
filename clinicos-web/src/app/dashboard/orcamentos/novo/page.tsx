'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Package,
    Calculator,
    AlertTriangle,
    Check,
    Boxes,
} from 'lucide-react';
import Link from 'next/link';
import { StockLotSelector } from '@/components/stock/StockLotSelector';

interface Customer {
    id: string;
    name: string;
    type: 'PF' | 'PJ';
}

interface Architect {
    id: string;
    name: string;
}

interface Product {
    id: string;
    name: string;
    sku?: string;
    priceCents?: number;
    boxCoverage?: number;
    piecesPerBox?: number;
    unit?: string;
    lots?: {
        id: string;
        lotNumber: string;
        quantity: number;
        shade?: string;
        caliber?: string;
        reservations?: any[];
    }[];
}

interface QuoteItem {
    productId: string;
    product?: Product;
    inputArea: number;
    quantityBoxes: number;
    resultingArea: number;
    unitPriceCents: number;
    discountPercent: number;
    discountCents: number;
    totalCents: number;
    preferredLotId?: string;
}

export default function NovoOrcamentoPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Data for selects
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [architects, setArchitects] = useState<Architect[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    // Form state
    const [customerId, setCustomerId] = useState('');
    const [architectId, setArchitectId] = useState('');
    const [notes, setNotes] = useState('');
    const [deliveryFeeCents, setDeliveryFeeCents] = useState(0);
    const [items, setItems] = useState<QuoteItem[]>([]);

    // Calculated totals
    const [subtotal, setSubtotal] = useState(0);
    const [totalDiscount, setTotalDiscount] = useState(0);
    const [total, setTotal] = useState(0);

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [customersRes, architectsRes, productsRes] = await Promise.all([
                    api.get('/customers'),
                    api.get('/architects'),
                    api.get('/stock/products'),
                ]);
                setCustomers(customersRes.data);
                setArchitects(architectsRes.data);
                setProducts(productsRes.data);
            } catch (err) {
                console.error('Error loading data:', err);
                setError('Erro ao carregar dados');
            }
        };
        fetchData();
    }, []);

    // Calculate totals whenever items change
    useEffect(() => {
        const sub = items.reduce((acc, item) => acc + (item.unitPriceCents * item.quantityBoxes), 0);
        const disc = items.reduce((acc, item) => acc + item.discountCents, 0);
        const tot = sub - disc + deliveryFeeCents;

        setSubtotal(sub);
        setTotalDiscount(disc);
        setTotal(tot);
    }, [items, deliveryFeeCents]);

    // m² → boxes calculation (critical logic)
    const calculateBoxesFromArea = useCallback((area: number, boxCoverage: number): number => {
        if (!boxCoverage || boxCoverage <= 0) return 0;
        return Math.ceil(area / boxCoverage);
    }, []);

    const calculateResultingArea = useCallback((boxes: number, boxCoverage: number): number => {
        return boxes * (boxCoverage || 0);
    }, []);

    // Add new item
    const addItem = () => {
        setItems([
            ...items,
            {
                productId: '',
                inputArea: 0,
                quantityBoxes: 0,
                resultingArea: 0,
                unitPriceCents: 0,
                discountPercent: 0,
                discountCents: 0,
                totalCents: 0,
            },
        ]);
    };

    // Remove item
    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    // Update item
    const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
        const newItems = [...items];
        const item = { ...newItems[index] };

        if (field === 'productId') {
            const product = products.find(p => p.id === value);
            item.productId = value;
            item.product = product;
            item.unitPriceCents = product?.priceCents || 0;
            item.preferredLotId = undefined;

            // Recalculate if area was already set
            if (item.inputArea > 0 && product?.boxCoverage) {
                item.quantityBoxes = calculateBoxesFromArea(item.inputArea, product.boxCoverage);
                item.resultingArea = calculateResultingArea(item.quantityBoxes, product.boxCoverage);
            }
        } else if (field === 'inputArea') {
            item.inputArea = Number(value);
            const product = item.product;
            if (product?.boxCoverage) {
                item.quantityBoxes = calculateBoxesFromArea(item.inputArea, product.boxCoverage);
                item.resultingArea = calculateResultingArea(item.quantityBoxes, product.boxCoverage);
            }
        } else if (field === 'quantityBoxes') {
            item.quantityBoxes = Number(value);
            const product = item.product;
            if (product?.boxCoverage) {
                item.resultingArea = calculateResultingArea(item.quantityBoxes, product.boxCoverage);
                item.inputArea = 0; // Clear inputArea when manually setting boxes
            }
        } else if (field === 'discountPercent') {
            item.discountPercent = Number(value);
            const itemSubtotal = item.unitPriceCents * item.quantityBoxes;
            item.discountCents = Math.round(itemSubtotal * (item.discountPercent / 100));
        } else {
            (item as any)[field] = value;
        }

        // Recalculate item total
        const itemSubtotal = item.unitPriceCents * item.quantityBoxes;
        item.totalCents = itemSubtotal - item.discountCents;

        newItems[index] = item;
        setItems(newItems);
    };

    // Split item into two lines (for mixed lots)
    const handleSplitItem = (index: number, lotId: string, maxQuantity: number) => {
        const currentItem = { ...items[index] };
        const remainingQuantity = currentItem.quantityBoxes - maxQuantity;

        if (remainingQuantity <= 0) return;

        // Update current item (limit to available)
        const updatedCurrent = {
            ...currentItem,
            quantityBoxes: maxQuantity,
            preferredLotId: lotId,
            inputArea: 0, // Reset manual area to avoid confusion
            resultingArea: calculateResultingArea(maxQuantity, currentItem.product?.boxCoverage || 0)
        };
        // Recalculate totals
        const sub1 = updatedCurrent.unitPriceCents * updatedCurrent.quantityBoxes;
        updatedCurrent.discountCents = Math.round(sub1 * (updatedCurrent.discountPercent / 100));
        updatedCurrent.totalCents = sub1 - updatedCurrent.discountCents;

        // Create new item (remaining)
        const newItem = {
            ...currentItem,
            quantityBoxes: remainingQuantity,
            preferredLotId: undefined, // Let user choose another lot
            inputArea: 0,
            resultingArea: calculateResultingArea(remainingQuantity, currentItem.product?.boxCoverage || 0)
        };
        // Recalculate totals
        const sub2 = newItem.unitPriceCents * newItem.quantityBoxes;
        newItem.discountCents = Math.round(sub2 * (newItem.discountPercent / 100));
        newItem.totalCents = sub2 - newItem.discountCents;

        const newItems = [...items];
        newItems[index] = updatedCurrent;
        newItems.splice(index + 1, 0, newItem); // Insert after
        setItems(newItems);
    };

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(cents / 100);
    };

    const handleSubmit = async () => {
        if (!customerId) {
            setError('Selecione um cliente');
            return;
        }
        if (items.length === 0) {
            setError('Adicione pelo menos um item');
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');

            const quoteData = {
                customerId,
                architectId: architectId && architectId !== 'none' ? architectId : undefined,
                notes: notes || undefined,
                deliveryFeeCents,
                items: items.map(item => ({
                    productId: item.productId,
                    inputArea: item.inputArea || undefined,
                    quantityBoxes: item.inputArea ? undefined : item.quantityBoxes,
                    unitPriceCents: item.unitPriceCents,
                    discountPercent: item.discountPercent || undefined,
                    preferredLotId: item.preferredLotId || undefined,
                })),
            };

            await api.post('/quotes', quoteData);
            router.push('/dashboard/orcamentos');
        } catch (err: any) {
            console.error('Error creating quote:', err);
            setError(err.response?.data?.message || 'Erro ao criar orçamento');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/orcamentos">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Voltar
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Novo Orçamento</h1>
                    <p className="text-gray-600 mt-1">
                        Crie um orçamento com cálculo automático de caixas
                    </p>
                </div>
            </div>

            {error && (
                <div className="rounded-lg bg-red-50 p-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <p className="text-red-600">{error}</p>
                </div>
            )}

            {/* Customer & Architect Selection */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Dados do Cliente</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="customer">Cliente *</Label>
                        <Select value={customerId} onValueChange={setCustomerId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o cliente" />
                            </SelectTrigger>
                            <SelectContent>
                                {customers.map((customer) => (
                                    <SelectItem key={customer.id} value={customer.id}>
                                        {customer.name} ({customer.type})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="architect">Arquiteto (opcional)</Label>
                        <Select value={architectId} onValueChange={setArchitectId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o arquiteto" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Nenhum</SelectItem>
                                {architects.map((architect) => (
                                    <SelectItem key={architect.id} value={architect.id}>
                                        {architect.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </Card>

            {/* Items */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Boxes className="h-5 w-5" />
                        Itens do Orçamento
                    </h2>
                    <Button onClick={addItem} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar Item
                    </Button>
                </div>

                {items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhum item adicionado</p>
                        <Button onClick={addItem} variant="link" className="mt-2">
                            Adicionar primeiro item
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {items.map((item, index) => (
                            <div
                                key={index}
                                className="border rounded-lg p-4 bg-gray-50 space-y-4"
                            >
                                <div className="flex items-start justify-between">
                                    <span className="text-sm font-medium text-gray-500">
                                        Item #{index + 1}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeItem(index)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {/* Product Select */}
                                    <div className="md:col-span-2 space-y-2">
                                        <Label>Produto</Label>
                                        <Select
                                            value={item.productId}
                                            onValueChange={(value) =>
                                                updateItem(index, 'productId', value)
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o produto" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {products.map((product) => (
                                                    <SelectItem key={product.id} value={product.id}>
                                                        {product.name}
                                                        {product.boxCoverage && (
                                                            <span className="text-gray-500 ml-2">
                                                                ({product.boxCoverage} m²/cx)
                                                            </span>
                                                        )}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {item.product?.boxCoverage && (
                                            <p className="text-xs text-gray-500">
                                                Cobertura: {item.product.boxCoverage} m²/caixa
                                                {item.product.piecesPerBox &&
                                                    ` • ${item.product.piecesPerBox} peças/caixa`}
                                            </p>
                                        )}
                                    </div>

                                    {/* Lot Select */}
                                    <div className="md:col-span-2">
                                        <StockLotSelector
                                            lots={item.product?.lots || []}
                                            selectedLotId={item.preferredLotId}
                                            quantityRequested={item.quantityBoxes}
                                            onSelectLot={(lotId) => updateItem(index, 'preferredLotId', lotId)}
                                            onSplitItem={(lotId, max) => handleSplitItem(index, lotId, max)}
                                            disabled={!item.productId}
                                        />
                                    </div>

                                    {/* Area Input */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-1">
                                            <Calculator className="h-3 w-3" />
                                            Área Desejada (m²)
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="Ex: 45.5"
                                            value={item.inputArea || ''}
                                            onChange={(e) =>
                                                updateItem(index, 'inputArea', e.target.value)
                                            }
                                            disabled={!item.product?.boxCoverage}
                                        />
                                    </div>

                                    {/* Boxes (calculated or manual) */}
                                    <div className="space-y-2">
                                        <Label>Qtd. Caixas</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={item.quantityBoxes || ''}
                                            onChange={(e) =>
                                                updateItem(index, 'quantityBoxes', e.target.value)
                                            }
                                            className={
                                                item.inputArea > 0
                                                    ? 'bg-green-50 border-green-200'
                                                    : ''
                                            }
                                        />
                                        {item.inputArea > 0 && item.quantityBoxes > 0 && (
                                            <p className="text-xs text-green-600 flex items-center gap-1">
                                                <Check className="h-3 w-3" />
                                                Calculado automaticamente
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Results Row */}
                                {item.quantityBoxes > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-2 border-t">
                                        <div>
                                            <Label className="text-xs text-gray-500">
                                                Área Resultante
                                            </Label>
                                            <p className="font-medium">
                                                {item.resultingArea.toFixed(2)} m²
                                            </p>
                                            {item.inputArea > 0 &&
                                                item.resultingArea > item.inputArea && (
                                                    <p className="text-xs text-amber-600">
                                                        +{(item.resultingArea - item.inputArea).toFixed(2)}{' '}
                                                        m² extra
                                                    </p>
                                                )}
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500">
                                                Preço/Caixa
                                            </Label>
                                            <p className="font-medium">
                                                {formatCurrency(item.unitPriceCents)}
                                            </p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500">
                                                Desconto (%)
                                            </Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={item.discountPercent || ''}
                                                onChange={(e) =>
                                                    updateItem(index, 'discountPercent', e.target.value)
                                                }
                                                className="h-8"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500">
                                                Desconto (R$)
                                            </Label>
                                            <p className="font-medium text-green-600">
                                                -{formatCurrency(item.discountCents)}
                                            </p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-gray-500">
                                                Total Item
                                            </Label>
                                            <p className="font-bold text-lg">
                                                {formatCurrency(item.totalCents)}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Delivery & Notes */}
            <Card className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Taxa de Entrega (R$)</Label>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={(deliveryFeeCents / 100) || ''}
                            onChange={(e) =>
                                setDeliveryFeeCents(Math.round(Number(e.target.value) * 100))
                            }
                            placeholder="0,00"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Observações</Label>
                        <Input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Observações do orçamento..."
                        />
                    </div>
                </div>
            </Card>

            {/* Totals */}
            <Card className="p-6 bg-gray-50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex justify-between gap-8">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-medium">{formatCurrency(subtotal)}</span>
                        </div>
                        {totalDiscount > 0 && (
                            <div className="flex justify-between gap-8">
                                <span className="text-gray-600">Descontos:</span>
                                <span className="font-medium text-green-600">
                                    -{formatCurrency(totalDiscount)}
                                </span>
                            </div>
                        )}
                        {deliveryFeeCents > 0 && (
                            <div className="flex justify-between gap-8">
                                <span className="text-gray-600">Entrega:</span>
                                <span className="font-medium">
                                    +{formatCurrency(deliveryFeeCents)}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between gap-8 pt-2 border-t">
                            <span className="text-lg font-semibold">Total:</span>
                            <span className="text-2xl font-bold text-primary">
                                {formatCurrency(total)}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Link href="/dashboard/orcamentos">
                            <Button variant="outline">Cancelar</Button>
                        </Link>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || items.length === 0}
                            className="min-w-[150px]"
                        >
                            {isSubmitting ? 'Salvando...' : 'Criar Orçamento'}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
