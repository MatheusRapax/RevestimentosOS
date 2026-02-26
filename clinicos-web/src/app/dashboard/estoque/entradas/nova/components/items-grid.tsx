'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StockEntryItem, AddItemData } from '@/hooks/useStockEntries';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Trash2, Plus, Check, ChevronsUpDown, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NFeItem } from '@/lib/nfe-parser';
import api from '@/lib/api';
import { ItemFiscalForm } from './item-fiscal-form';

interface ItemsGridProps {
    items: StockEntryItem[];
    onAdd: (data: AddItemData) => Promise<void>;
    onRemove: (itemId: string) => Promise<void>;
    isLoading: boolean;
    readOnly?: boolean;
    pendingItems?: NFeItem[];
    onResolvePending?: (index: number) => void;
    onUpdate?: (itemId: string, data: Partial<AddItemData>) => Promise<void>;
}

interface Product {
    id: string;
    name: string;
    unit?: string;
    boxCoverage?: number;
    piecesPerBox?: number;
}

export function ItemsGrid({ items, onAdd, onRemove, isLoading, readOnly, pendingItems, onResolvePending, onUpdate }: ItemsGridProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [open, setOpen] = useState(false);
    const [resolvingIndex, setResolvingIndex] = useState<number | null>(null);
    const [productId, setProductId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unitCost, setUnitCost] = useState('');
    const [lotNumber, setLotNumber] = useState('');
    const [expirationDate, setExpirationDate] = useState('');
    const [manufacturer, setManufacturer] = useState('');

    // Edit state
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editQuantity, setEditQuantity] = useState('');
    const [editUnitCost, setEditUnitCost] = useState('');
    const [editLotNumber, setEditLotNumber] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    // Fiscal integration
    const [fiscalData, setFiscalData] = useState<Partial<AddItemData>>({});
    const [showFiscal, setShowFiscal] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/stock/products?isActive=true');
            setProducts(res.data);
        } catch (err) {
            console.error('Error fetching products', err);
        }
    };

    const handleAdd = async () => {
        if (!productId || !quantity) return;

        await onAdd({
            productId,
            quantity: parseFloat(quantity),
            unitCost: unitCost ? parseFloat(unitCost) : undefined,
            lotNumber: lotNumber || undefined,
            expirationDate: expirationDate || undefined,
            manufacturer: manufacturer || undefined,
            ...fiscalData
        });

        if (resolvingIndex !== null && onResolvePending) {
            onResolvePending(resolvingIndex);
            setResolvingIndex(null);
        }

        // Reset fields
        setProductId('');
        setQuantity('');
        setUnitCost('');
        setLotNumber('');
        setExpirationDate('');
        setManufacturer('');
        setFiscalData({});
    };

    const handleResolve = (index: number, item: NFeItem) => {
        setResolvingIndex(index);
        setQuantity(item.quantity.toString());
        setUnitCost(item.unitValue.toFixed(4));

        if (item.lotNumber) setLotNumber(item.lotNumber);
        if (item.expirationDate) setExpirationDate(item.expirationDate);

        const match = products.find(p => p.name.toLowerCase() === item.name.toLowerCase());
        if (match) {
            setProductId(match.id);
        }
    };

    const handleEditClick = (item: StockEntryItem) => {
        setEditingItemId(item.id);
        setEditQuantity(String(item.quantity));
        setEditUnitCost(item.unitCost ? String(item.unitCost) : '');
        setEditLotNumber(item.lotNumber || '');
    };

    const handleCancelEdit = () => {
        setEditingItemId(null);
    };

    const handleSaveEdit = async () => {
        if (!editingItemId || !onUpdate) return;
        try {
            setIsUpdating(true);
            await onUpdate(editingItemId, {
                quantity: parseFloat(editQuantity),
                unitCost: editUnitCost ? parseFloat(editUnitCost) : undefined,
                lotNumber: editLotNumber || undefined
            });
            setEditingItemId(null);
        } finally {
            setIsUpdating(false);
        }
    };

    const selectedProduct = products.find(p => p.id === productId);

    return (
        <div className="space-y-4 border p-4 rounded-md">

            <ItemFiscalForm
                open={showFiscal}
                onClose={() => setShowFiscal(false)}
                onSave={(data) => setFiscalData(data)}
                productName={selectedProduct?.name}
            />

            {pendingItems && pendingItems.length > 0 && (
                <div className="mb-6 border-b pb-6">
                    <h3 className="text-sm font-semibold mb-2 text-orange-600 flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Itens Pendentes (Importado do XML)
                    </h3>
                    <div className="rounded-md border bg-orange-50/50">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Produto (XML)</TableHead>
                                    <TableHead>Qtd</TableHead>
                                    <TableHead>Valor Unit.</TableHead>
                                    <TableHead>Ação</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingItems.map((item, idx) => (
                                    <TableRow key={idx} className={resolvingIndex === idx ? "bg-blue-50" : ""}>
                                        <TableCell className="text-xs">{item.code}</TableCell>
                                        <TableCell className="text-xs font-medium">{item.name}</TableCell>
                                        <TableCell className="text-xs">{item.quantity} {item.unit}</TableCell>
                                        <TableCell className="text-xs">R$ {item.unitValue}</TableCell>
                                        <TableCell>
                                            <Button
                                                size="sm"
                                                variant={resolvingIndex === idx ? "default" : "outline"}
                                                className="h-7 text-xs"
                                                onClick={() => handleResolve(idx, item)}
                                            >
                                                {resolvingIndex === idx ? "Preenchendo..." : "Usar"}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            <h2 className="text-lg font-semibold">Itens da Entrada</h2>

            {!readOnly && (
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end bg-muted/50 p-2 rounded-md">
                    <div className="md:col-span-2 space-y-1">
                        <label className="text-xs font-medium">Produto</label>
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={open}
                                    className="w-full justify-between font-normal"
                                >
                                    {productId
                                        ? products.find((p) => p.id === productId)?.name
                                        : "Selecione o produto..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Buscar produto..." />
                                    <CommandList>
                                        <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                                        <CommandGroup>
                                            {products.map((product) => (
                                                <CommandItem
                                                    key={product.id}
                                                    value={product.name}
                                                    onSelect={() => {
                                                        setProductId(product.id);
                                                        setOpen(false);
                                                    }}
                                                    className="cursor-pointer data-[disabled]:pointer-events-auto data-[disabled]:opacity-100"
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            productId === product.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {product.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium">Qtd {selectedProduct?.unit ? `(${selectedProduct.unit})` : ''}</label>
                        <Input
                            type="number"
                            min="0.01"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                        />
                        {selectedProduct?.boxCoverage && quantity && (
                            <p className="text-[10px] text-muted-foreground pt-1">
                                {(parseFloat(quantity) * selectedProduct.boxCoverage).toFixed(2)} m²
                            </p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium">Custo Unit.</label>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={unitCost}
                            onChange={e => setUnitCost(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium">Lote</label>
                        <Input
                            value={lotNumber}
                            onChange={e => setLotNumber(e.target.value)}
                            placeholder="Ex: NF-123456"
                        />
                    </div>

                    <div className="space-y-1 flex items-end">
                        <Button
                            variant={Object.keys(fiscalData).length > 0 ? "default" : "outline"}
                            size="icon"
                            className="w-10 mr-2"
                            onClick={() => setShowFiscal(true)}
                            title="Dados Fiscais"
                        >
                            <span className="text-xs font-bold">F</span>
                        </Button>

                        <Button
                            className="flex-1"
                            onClick={handleAdd}
                            disabled={isLoading || !productId || !quantity}
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            )}

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead>Lote</TableHead>
                            <TableHead>Quantidade</TableHead>
                            <TableHead>Custo Unit.</TableHead>
                            <TableHead>Total</TableHead>
                            {!readOnly && <TableHead className="w-[50px]"></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                                    Nenhum item adicionado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            items?.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.product.name}</TableCell>
                                    <TableCell className="text-sm">
                                        {editingItemId === item.id ? (
                                            <Input
                                                value={editLotNumber}
                                                onChange={e => setEditLotNumber(e.target.value)}
                                                className="h-8 w-24 text-xs"
                                                placeholder="Lote"
                                            />
                                        ) : (
                                            item.lotNumber || '-'
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            {editingItemId === item.id ? (
                                                <Input
                                                    type="number"
                                                    value={editQuantity}
                                                    onChange={e => setEditQuantity(e.target.value)}
                                                    className="h-8 w-20 text-xs"
                                                />
                                            ) : (
                                                <span>
                                                    {item.quantity} {item.product.unit}
                                                </span>
                                            )}
                                            {item.product.boxCoverage && (
                                                <span className="text-[10px] text-muted-foreground">
                                                    {((editingItemId === item.id ? parseFloat(editQuantity || '0') : item.quantity) * item.product.boxCoverage).toFixed(2)} m²
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {editingItemId === item.id ? (
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={editUnitCost}
                                                onChange={e => setEditUnitCost(e.target.value)}
                                                className="h-8 w-24 text-xs"
                                                placeholder="0,00"
                                            />
                                        ) : (
                                            item.unitCost ?
                                                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitCost)
                                                : '-'
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {item.totalCost && editingItemId !== item.id ?
                                            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalCost)
                                            : editingItemId === item.id ? '-' : '-'}
                                    </TableCell>
                                    {!readOnly && (
                                        <TableCell>
                                            {editingItemId === item.id ? (
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        onClick={handleSaveEdit}
                                                        disabled={isUpdating || !editQuantity}
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground"
                                                        onClick={handleCancelEdit}
                                                        disabled={isUpdating}
                                                    >
                                                        <Trash2 className="h-4 w-4" /> {/* Or an X icon, but let's just use what's available or leave it missing if we want to add an X later */}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-xs underline"
                                                        onClick={() => handleEditClick(item)}
                                                        disabled={isLoading || isUpdating || editingItemId !== null}
                                                    >
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500"
                                                        onClick={() => onRemove(item.id)}
                                                        disabled={isLoading || isUpdating || editingItemId !== null}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
