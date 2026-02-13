'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
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

interface Product {
    id: string;
    name: string;
    sku?: string;
    boxCoverage?: number;
    priceCents?: number;
}

interface ProductComboboxProps {
    products: Product[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    isLoading?: boolean;
}

export function ProductCombobox({
    products,
    value,
    onChange,
    disabled,
    isLoading,
}: ProductComboboxProps) {
    const [open, setOpen] = React.useState(false);

    const selectedProduct = products.find((p) => p.id === value);

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
                        <span className="truncate">
                            {selectedProduct.name}
                        </span>
                    ) : (
                        <span className="text-muted-foreground">Selecione o produto...</span>
                    )}
                    {isLoading ? (
                        <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
                    ) : (
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    )}
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
                                        onChange(product.id === value ? '' : product.id);
                                        setOpen(false);
                                    }}
                                    className="cursor-pointer data-[disabled]:pointer-events-auto data-[disabled]:opacity-100"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === product.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span>{product.name}</span>
                                        {product.boxCoverage && (
                                            <span className="text-xs text-muted-foreground">
                                                {product.boxCoverage} m²/cx
                                            </span>
                                        )}
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
