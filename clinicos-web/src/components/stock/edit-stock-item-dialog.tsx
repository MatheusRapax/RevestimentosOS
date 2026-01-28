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

interface StockItem {
    id: string;
    name: string;
    description?: string;
    unit?: string;
    sku?: string;
    minStock?: number;
    isActive: boolean;
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
    });
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
            });
        }
    }, [item]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!item) return;

        setError('');
        setIsLoading(true);

        try {
            await api.patch(`/stock/${item.id}`, formData);
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
            <DialogContent className="sm:max-w-[500px]">
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
                        <Label htmlFor="edit-description">Descrição (opcional)</Label>
                        <Input
                            id="edit-description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Descrição do produto"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-unit">Unidade (opcional)</Label>
                            <Input
                                id="edit-unit"
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                placeholder="Ex: unidade, caixa"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-sku">SKU (opcional)</Label>
                            <Input
                                id="edit-sku"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                placeholder="Código SKU"
                            />
                        </div>
                    </div>

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

                    <div className="flex gap-3 justify-end pt-4">
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
