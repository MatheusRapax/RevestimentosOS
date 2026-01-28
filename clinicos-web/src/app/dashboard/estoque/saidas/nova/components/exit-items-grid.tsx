'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StockExitItem, AddExitItemData } from '@/hooks/useStockExits';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Trash2, Plus, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface ExitItemsGridProps {
    items: StockExitItem[];
    onAdd: (data: AddExitItemData) => Promise<void>;
    onRemove: (itemId: string) => Promise<void>;
    isLoading: boolean;
    readOnly?: boolean;
}

interface Product {
    id: string;
    name: string;
    unit?: string;
    // We could add availableStock here if backend returned it, useful for validation
}

export function ExitItemsGrid({ items, onAdd, onRemove, isLoading, readOnly }: ExitItemsGridProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [open, setOpen] = useState(false);
    const [productId, setProductId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [lotId, setLotId] = useState('');

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
            lotId: lotId || undefined,
        });

        // Reset fields
        setProductId('');
        setQuantity('');
        setLotId('');
    };

    const selectedProduct = products.find(p => p.id === productId);

    return (
        <div className="space-y-4 border p-4 rounded-md">
            <h2 className="text-lg font-semibold">Itens da Saída</h2>

            {!readOnly && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end bg-muted/50 p-2 rounded-md">
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
                                                        setProductId(product.id === productId ? "" : product.id);
                                                        setOpen(false);
                                                    }}
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
                        <label className="text-xs font-medium">Lote (Opcional)</label>
                        {/* Ideally this select would filter lots by product, but simplified for now */}
                        <Input
                            placeholder="ID Lote (Automático se vazio)"
                            value={lotId}
                            onChange={e => setLotId(e.target.value)}
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
                            <TableHead>Lote Específico</TableHead>
                            <TableHead>Quantidade</TableHead>
                            {!readOnly && <TableHead className="w-[50px]"></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                    Nenhum item adicionado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            items?.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.product.name}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs">
                                            <span className="text-muted-foreground">{item.lotId || 'Automático (FIFO)'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {item.quantity} {item.product.unit}
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
