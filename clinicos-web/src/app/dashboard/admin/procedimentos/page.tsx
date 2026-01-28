'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ClipboardList, Plus, Edit, Trash2, Package } from 'lucide-react';
import api from '@/lib/api';

interface Product {
    id: string;
    name: string;
    unit: string | null;
    priceCents: number | null;
}

interface Consumable {
    id: string;
    quantity: number;
    product: Product;
}

interface Procedure {
    id: string;
    name: string;
    description: string | null;
    priceCents: number;
    durationMin: number | null;
    isActive: boolean;
    consumables: Consumable[];
}

export default function ProceduresPage() {
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dialog states
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        priceCents: 0,
        durationMin: 30,
    });
    const [saving, setSaving] = useState(false);

    // Consumables dialog
    const [consumablesDialogOpen, setConsumablesDialogOpen] = useState(false);
    const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
    const [newConsumable, setNewConsumable] = useState({ productId: '', quantity: 1 });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [procRes, prodRes] = await Promise.all([
                api.get('/procedures'),
                api.get('/stock/products'),
            ]);
            setProcedures(procRes.data);
            setProducts(prodRes.data);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openCreateDialog = () => {
        setEditingId(null);
        setFormData({ name: '', description: '', priceCents: 0, durationMin: 30 });
        setIsDialogOpen(true);
    };

    const openEditDialog = (proc: Procedure) => {
        setEditingId(proc.id);
        setFormData({
            name: proc.name,
            description: proc.description || '',
            priceCents: proc.priceCents,
            durationMin: proc.durationMin || 30,
        });
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (editingId) {
                await api.patch(`/procedures/${editingId}`, formData);
            } else {
                await api.post('/procedures', formData);
            }
            setIsDialogOpen(false);
            await fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Erro ao salvar');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remover este procedimento?')) return;
        try {
            await api.delete(`/procedures/${id}`);
            await fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Erro ao remover');
        }
    };

    const openConsumablesDialog = (proc: Procedure) => {
        setSelectedProcedure(proc);
        setNewConsumable({ productId: '', quantity: 1 });
        setConsumablesDialogOpen(true);
    };

    const addConsumable = async () => {
        if (!selectedProcedure || !newConsumable.productId) return;
        try {
            await api.post(`/procedures/${selectedProcedure.id}/consumables`, newConsumable);
            await fetchData();
            const updated = procedures.find(p => p.id === selectedProcedure.id);
            if (updated) setSelectedProcedure(updated);
            setNewConsumable({ productId: '', quantity: 1 });
        } catch (err: any) {
            alert(err.response?.data?.message || 'Erro ao adicionar');
        }
    };

    const removeConsumable = async (productId: string) => {
        if (!selectedProcedure) return;
        try {
            await api.delete(`/procedures/${selectedProcedure.id}/consumables/${productId}`);
            await fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Erro ao remover');
        }
    };

    const formatPrice = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ClipboardList className="h-6 w-6" />
                        Catálogo de Procedimentos
                    </h1>
                    <p className="text-gray-500">Gerencie os procedimentos e seus preços</p>
                </div>
                <Button onClick={openCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Procedimento
                </Button>
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead className="text-right">Preço</TableHead>
                                <TableHead className="text-center">Duração</TableHead>
                                <TableHead className="text-center">Insumos</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {procedures.map((proc) => (
                                <TableRow key={proc.id}>
                                    <TableCell className="font-medium">{proc.name}</TableCell>
                                    <TableCell className="text-gray-500 max-w-xs truncate">
                                        {proc.description || '-'}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-green-600">
                                        {formatPrice(proc.priceCents)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {proc.durationMin ? `${proc.durationMin}min` : '-'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openConsumablesDialog(proc)}
                                        >
                                            <Package className="h-4 w-4 mr-1" />
                                            {proc.consumables.length}
                                        </Button>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Button size="sm" variant="ghost" onClick={() => openEditDialog(proc)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(proc.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {procedures.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                        Nenhum procedimento cadastrado
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Editar Procedimento' : 'Novo Procedimento'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium">Nome *</label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ex: Consulta Médica"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Descrição</label>
                            <Input
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descrição breve"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">Preço (R$) *</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.priceCents / 100}
                                    onChange={(e) => setFormData({ ...formData, priceCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Duração (min)</label>
                                <Input
                                    type="number"
                                    value={formData.durationMin}
                                    onChange={(e) => setFormData({ ...formData, durationMin: parseInt(e.target.value || '0') })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving || !formData.name}>
                            {saving ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Consumables Dialog */}
            <Dialog open={consumablesDialogOpen} onOpenChange={setConsumablesDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Insumos - {selectedProcedure?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* Add new */}
                        <div className="flex gap-2">
                            <select
                                value={newConsumable.productId}
                                onChange={(e) => setNewConsumable({ ...newConsumable, productId: e.target.value })}
                                className="flex-1 px-3 py-2 border rounded"
                            >
                                <option value="">Selecione um produto</option>
                                {products.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <Input
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={newConsumable.quantity}
                                onChange={(e) => setNewConsumable({ ...newConsumable, quantity: parseFloat(e.target.value) })}
                                className="w-20"
                            />
                            <Button onClick={addConsumable} disabled={!newConsumable.productId}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* List */}
                        <div className="border rounded divide-y">
                            {selectedProcedure?.consumables.map((c) => (
                                <div key={c.id} className="flex items-center justify-between p-2">
                                    <span>{c.product.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500">{c.quantity} {c.product.unit}</span>
                                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeConsumable(c.product.id)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {selectedProcedure?.consumables.length === 0 && (
                                <div className="p-4 text-center text-gray-500">Nenhum insumo</div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
