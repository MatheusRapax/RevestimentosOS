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

interface StockExitDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function StockExitDialog({ open, onOpenChange, onSuccess }: StockExitDialogProps) {
    const { removeStock } = useStockMovements();
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);

    const [productId, setProductId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');
    const [destinationType, setDestinationType] = useState('SECTOR');
    const [destinationName, setDestinationName] = useState('');

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
        setReason('');
        setDestinationType('SECTOR');
        setDestinationName('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productId || !quantity) return;

        try {
            setLoading(true);
            await removeStock({
                productId,
                quantity: parseFloat(quantity),
                reason,
                destinationType,
                destinationName,
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
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Nova Saída de Estoque</DialogTitle>
                    <DialogDescription>
                        Registre a saída de produtos para uso em setor, sala ou outros.
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
                            <Label>Destino</Label>
                            <Select value={destinationType} onValueChange={setDestinationType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SECTOR">Setor</SelectItem>
                                    <SelectItem value="ROOM">Sala/Consultório</SelectItem>
                                    <SelectItem value="PATIENT">Paciente (Individual)</SelectItem>
                                    <SelectItem value="DISCARD">Descarte/Avaria</SelectItem>
                                    <SelectItem value="ADJUST">Ajuste de Saldo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Nome do Destino</Label>
                        <Input
                            value={destinationName}
                            onChange={(e) => setDestinationName(e.target.value)}
                            placeholder="Ex: Sala de Curativos, UTI 2..."
                            required={destinationType !== 'ADJUST' && destinationType !== 'DISCARD'}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Motivo / Observação</Label>
                        <Input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ex: Reabastecimento semanal"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading || !productId}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Saída
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
