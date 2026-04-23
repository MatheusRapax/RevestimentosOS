'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import api from '@/lib/api';

interface Product {
    id: string;
    name: string;
    sku?: string;
    format?: string;
    line?: string;
    usage?: string;
    boxCoverage?: number;
    priceCents?: number;
    promotionalPriceCents?: number;
    lots?: any[];
}

interface ProductComboboxProps {
    value: string;
    onChange: (productId: string, product?: Product) => void;
    disabled?: boolean;
    /** @deprecated Pass nothing — combobox now fetches its own data */
    products?: Product[];
}

const DEBOUNCE_MS = 350;
const RECENT_LIMIT = 10;

export function ProductCombobox({ value, onChange, disabled }: ProductComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const [results, setResults] = React.useState<Product[]>([]);
    const [recentProducts, setRecentProducts] = React.useState<Product[]>([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
    const debounceRef = React.useRef<ReturnType<typeof setTimeout>>(null);

    // Fetch recently added products on mount (shown when no query)
    React.useEffect(() => {
        api.get(`/stock/products?limit=${RECENT_LIMIT}&page=1`)
            .then(res => {
                const data = res.data?.data ?? res.data ?? [];
                setRecentProducts(Array.isArray(data) ? data : []);
            })
            .catch(() => setRecentProducts([]));
    }, []);

    // Resolve selected product name when value arrives from parent
    React.useEffect(() => {
        if (!value) { setSelectedProduct(null); return; }
        // Check in already-loaded lists first
        const found = [...recentProducts, ...results].find(p => p.id === value);
        if (found) { setSelectedProduct(found); return; }
        // Fallback: fetch individually
        api.get(`/stock/products/${value}`)
            .then(res => setSelectedProduct(res.data))
            .catch(() => setSelectedProduct(null));
    }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

    // Debounced search
    React.useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!query || query.length < 2) {
            setResults([]);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await api.get(`/stock/products`, {
                    params: { search: query, limit: 20, page: 1 },
                });
                const data = res.data?.data ?? res.data ?? [];
                setResults(Array.isArray(data) ? data : []);
            } catch {
                setResults([]);
            } finally {
                setIsSearching(false);
            }
        }, DEBOUNCE_MS);
    }, [query]);

    const displayList = query.length >= 2 ? results : recentProducts;
    const groupLabel = query.length >= 2 ? 'Resultados' : 'Recentes';

    const handleSelect = (product: Product) => {
        onChange(product.id === value ? '' : product.id, product);
        setSelectedProduct(product.id === value ? null : product);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal text-left"
                    disabled={disabled}
                >
                    {selectedProduct ? (
                        <span className="truncate">{selectedProduct.name}</span>
                    ) : (
                        <span className="text-muted-foreground">Selecione o produto...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[420px] p-0" align="start">
                <Command shouldFilter={false}>
                    <div className="flex items-center border-b px-3">
                        {isSearching
                            ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                            : <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                        }
                        <CommandInput
                            placeholder="Buscar por nome, SKU, formato, linha..."
                            value={query}
                            onValueChange={setQuery}
                            className="border-0 focus:ring-0 px-0"
                        />
                    </div>
                    <CommandList>
                        <CommandEmpty>
                            {query.length < 2
                                ? 'Digite ao menos 2 caracteres para buscar.'
                                : 'Nenhum produto encontrado.'
                            }
                        </CommandEmpty>
                        {displayList.length > 0 && (
                            <CommandGroup heading={groupLabel}>
                                {displayList.map((product) => (
                                    <CommandItem
                                        key={product.id}
                                        value={product.id}
                                        onSelect={() => handleSelect(product)}
                                        className="cursor-pointer data-[disabled]:pointer-events-auto data-[disabled]:opacity-100 py-2"
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 h-4 w-4 shrink-0',
                                                value === product.id ? 'opacity-100' : 'opacity-0',
                                            )}
                                        />
                                        <div className="flex flex-col flex-1 min-w-0">
                                            <span className="font-medium truncate">{product.name}</span>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                {product.sku && (
                                                    <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>
                                                )}
                                                {product.format && (
                                                    <span className="text-xs bg-slate-100 text-slate-600 px-1 rounded">{product.format}</span>
                                                )}
                                                {product.line && (
                                                    <span className="text-xs text-muted-foreground">{product.line}</span>
                                                )}
                                                {product.usage && (
                                                    <span className="text-xs text-muted-foreground italic">{product.usage}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end text-sm ml-2 shrink-0">
                                            {product.promotionalPriceCents ? (
                                                <>
                                                    <span className="text-xs text-muted-foreground line-through">
                                                        {(product.priceCents! / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </span>
                                                    <span className="font-semibold text-green-600">
                                                        {(product.promotionalPriceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </span>
                                                </>
                                            ) : product.priceCents ? (
                                                <span className="font-medium">
                                                    {(product.priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Preço n/a</span>
                                            )}
                                            {product.boxCoverage && (
                                                <span className="text-xs text-muted-foreground">{product.boxCoverage} m²/cx</span>
                                            )}
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
