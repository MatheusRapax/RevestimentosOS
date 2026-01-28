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

interface StockAdjustmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function StockAdjustmentDialog({ open, onOpenChange, onSuccess }: StockAdjustmentDialogProps) {
    const { adjustStock } = useStockMovements();
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);

    const [productId, setProductId] = useState('');
    const [type, setType] = useState<'ADD' | 'REMOVE'>('ADD');
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');

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
        setType('ADD');
        setQuantity('');
        setReason('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productId || !quantity || !reason) return;

        try {
            setLoading(true);
            const qty = parseInt(quantity);
            const finalQty = type === 'REMOVE' ? -qty : qty;

            await adjustStock({
                productId,
                quantity: finalQty,
                reason: `${type === 'ADD' ? 'Entrada' : 'Saída'} manual: ${reason}`,
            });

            onSuccess();
            onOpenChange(false);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const selectedProduct = products.find(p => p.id === productId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Ajuste Manual de Estoque</DialogTitle>
                    <DialogDescription>
                        Registre uma entrada ou saída manual para acertar o estoque.
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
                        {selectedProduct && selectedProduct.totalStock !== undefined && (
                            <p className="text-xs text-muted-foreground">
                                Estoque atual: <strong>{selectedProduct.totalStock}</strong>
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select value={type} onValueChange={(v: any) => setType(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ADD">Entrada (+)</SelectItem>
                                    <SelectItem value="REMOVE">Saída (-)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Quantidade</Label>
                            <Input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="0"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Motivo</Label>
                        <Input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ex: Contagem física, Perda, Doação..."
                            required
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading || !productId}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Ajuste
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
