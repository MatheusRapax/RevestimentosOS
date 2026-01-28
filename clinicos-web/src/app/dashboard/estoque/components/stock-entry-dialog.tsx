'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStockMovements } from '@/hooks/useStockMovements';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface Product {
    id: string;
    name: string;
    totalStock?: number;
}

interface StockEntryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function StockEntryDialog({ open, onOpenChange, onSuccess }: StockEntryDialogProps) {
    const { addStock } = useStockMovements();
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);

    const [productId, setProductId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [lotNumber, setLotNumber] = useState('');
    const [expirationDate, setExpirationDate] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [supplier, setSupplier] = useState('');

    useEffect(() => {
        if (open) {
            fetchProducts();
            resetForm();
        }
    }, [open]);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/stock/products?isActive=true');
            setProducts(res.data);
        } catch (err) {
            console.error('Error fetching products', err);
        }
    };

    const resetForm = () => {
        setProductId('');
        setQuantity('');
        setLotNumber('');
        setExpirationDate('');
        setInvoiceNumber('');
        setSupplier('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productId || !quantity || !lotNumber || !expirationDate) return;

        try {
            setLoading(true);
            await addStock({
                productId,
                quantity: parseFloat(quantity),
                lotNumber,
                expirationDate,
                invoiceNumber: invoiceNumber || undefined,
                supplier: supplier || undefined,
            });

            onSuccess();
            onOpenChange(false);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Nova Entrada de Estoque</DialogTitle>
                    <DialogDescription>
                        Registre a entrada de produtos via Nota Fiscal ou avulsa.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Produto</Label>
                        <Select value={productId} onValueChange={setProductId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione um produto" />
                            </SelectTrigger>
                            <SelectContent>
                                {products.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Quantidade</Label>
                            <Input
                                type="number"
                                min="0.01"
                                step="any"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="0"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Número do Lote</Label>
                            <Input
                                value={lotNumber}
                                onChange={(e) => setLotNumber(e.target.value)}
                                placeholder="Lote #123"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Validade</Label>
                        <Input
                            type="date"
                            value={expirationDate}
                            onChange={(e) => setExpirationDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nota Fiscal (Opcional)</Label>
                            <Input
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                placeholder="Ex: NF-e 00123"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Fornecedor (Opcional)</Label>
                            <Input
                                value={supplier}
                                onChange={(e) => setSupplier(e.target.value)}
                                placeholder="Ex: MedHosp Distribuidora"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading || !productId}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Entrada
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
