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

interface ItemsGridProps {
    items: StockEntryItem[];
    onAdd: (data: AddItemData) => Promise<void>;
    onRemove: (itemId: string) => Promise<void>;
    isLoading: boolean;
    readOnly?: boolean;
    pendingItems?: NFeItem[];
    onResolvePending?: (index: number) => void;
}

interface Product {
    id: string;
    name: string;
    unit?: string;
}

export function ItemsGrid({ items, onAdd, onRemove, isLoading, readOnly, pendingItems, onResolvePending }: ItemsGridProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [open, setOpen] = useState(false);
    const [resolvingIndex, setResolvingIndex] = useState<number | null>(null);
    const [productId, setProductId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unitCost, setUnitCost] = useState('');
    const [lotNumber, setLotNumber] = useState('');
    const [expirationDate, setExpirationDate] = useState('');
    const [manufacturer, setManufacturer] = useState('');

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
    };

    const handleResolve = (index: number, item: NFeItem) => {
        setResolvingIndex(index);
        setQuantity(item.quantity.toString());
        setUnitCost(item.unitValue.toFixed(4));

        // Try to fuzzy match product name? For now, we just rely on user manual selection or we could implement basic matching
        // Simple exact match attempt
        const match = products.find(p => p.name.toLowerCase() === item.name.toLowerCase());
        if (match) {
            setProductId(match.id);
        }
    };

    const selectedProduct = products.find(p => p.id === productId);

    return (
        <div className="space-y-4 border p-4 rounded-md">
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
                                                    onSelect={(currentValue) => {
                                                        // Find the product by name since onSelect passes the value
                                                        const selected = products.find(p => p.name.toLowerCase() === currentValue.toLowerCase());
                                                        if (selected) {
                                                            setProductId(selected.id === productId ? "" : selected.id);
                                                        }
                                                        setOpen(false);
                                                    }}
                                                    className="cursor-pointer"
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

                    <div className="space-y-1">
                        <Button
                            className="w-full"
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
                                        {item.lotNumber || '-'}
                                    </TableCell>
                                    <TableCell>
                                        {item.quantity} {item.product.unit}
                                    </TableCell>
                                    <TableCell>
                                        {item.unitCost ?
                                            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitCost)
                                            : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {item.totalCost ?
                                            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalCost)
                                            : '-'}
                                    </TableCell>
                                    {!readOnly && (
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500"
                                                onClick={() => onRemove(item.id)}
                                                disabled={isLoading}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
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
