'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Users, Edit, Trash2, Percent, Building2 } from 'lucide-react';

interface Architect {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    document?: string;
    commissionRate?: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

const emptyForm = {
    name: '',
    email: '',
    phone: '',
    document: '',
    commissionRate: 5,
};

export default function ArquitetosPage() {
    const [architects, setArchitects] = useState<Architect[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Create/Edit dialog
    const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
    const [editingArchitect, setEditingArchitect] = useState<Architect | null>(null);
    const [formData, setFormData] = useState(emptyForm);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    const fetchArchitects = async () => {
        try {
            setIsLoading(true);
            setError('');
            const response = await api.get('/architects');
            setArchitects(response.data);
        } catch (err: any) {
            console.error('Error fetching architects:', err);
            setError('Erro ao carregar arquitetos');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchArchitects();
    }, []);

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const openCreateDialog = () => {
        setEditingArchitect(null);
        setFormData(emptyForm);
        setIsFormDialogOpen(true);
    };

    const openEditDialog = (architect: Architect) => {
        setEditingArchitect(architect);
        setFormData({
            name: architect.name || '',
            email: architect.email || '',
            phone: architect.phone || '',
            document: architect.document || '',
            commissionRate: architect.commissionRate || 5,
        });
        setIsFormDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            setError('Nome é obrigatório');
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');

            const payload = {
                ...formData,
                commissionRate: Number(formData.commissionRate),
            };

            if (editingArchitect) {
                await api.put(`/architects/${editingArchitect.id}`, payload);
                setSuccessMessage('Arquiteto atualizado com sucesso!');
            } else {
                await api.post('/architects', payload);
                setSuccessMessage('Arquiteto criado com sucesso!');
            }

            setIsFormDialogOpen(false);
            fetchArchitects();
        } catch (err: any) {
            console.error('Error saving architect:', err);
            setError(err.response?.data?.message || 'Erro ao salvar arquiteto');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (architectId: string) => {
        setDeletingId(architectId);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!deletingId) return;

        try {
            setLoadingAction(deletingId);
            await api.delete(`/architects/${deletingId}`);
            setArchitects(prev => prev.filter(a => a.id !== deletingId));
            setShowDeleteConfirm(false);
            setDeletingId(null);
            setSuccessMessage('Arquiteto excluído com sucesso!');
        } catch (err: any) {
            console.error('Error deleting architect:', err);
            setError(err.response?.data?.message || 'Erro ao excluir arquiteto');
        } finally {
            setLoadingAction(null);
        }
    };

    const getStatusBadge = (isActive: boolean) => {
        if (isActive) {
            return (
                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Ativo
                </span>
            );
        }
        return (
            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                Inativo
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg text-gray-600">Carregando arquitetos...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Arquitetos</h1>
                    <p className="text-gray-600 mt-1">Gerencie arquitetos parceiros e comissões</p>
                </div>
                <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Arquiteto
                </Button>
            </div>

            {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
                    {successMessage}
                </div>
            )}

            {error && (
                <div className="rounded-lg bg-red-50 p-4">
                    <p className="text-red-600">{error}</p>
                    <Button onClick={fetchArchitects} className="mt-4" variant="outline">
                        Tentar novamente
                    </Button>
                </div>
            )}

            {architects.length === 0 ? (
                <Card className="p-12 text-center">
                    <div className="text-gray-400 mb-4">
                        <Building2 className="h-16 w-16 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Nenhum arquiteto cadastrado
                    </h3>
                    <p className="text-gray-600 mb-4">
                        Cadastre arquitetos parceiros para vincular a vendas
                    </p>
                    <Button onClick={openCreateDialog}>
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Arquiteto
                    </Button>
                </Card>
            ) : (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Nome
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Contato
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        CPF
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Comissão
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {architects.map((architect) => (
                                    <tr key={architect.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {architect.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                {architect.email && (
                                                    <div className="text-sm text-gray-900">
                                                        {architect.email}
                                                    </div>
                                                )}
                                                {architect.phone && (
                                                    <div className="text-sm text-gray-500">
                                                        {architect.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {architect.document || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium rounded bg-amber-100 text-amber-800">
                                                <Percent className="h-3 w-3" />
                                                {architect.commissionRate || 0}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(architect.isActive)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openEditDialog(architect)}
                                                    disabled={loadingAction === architect.id}
                                                >
                                                    <Edit className="h-3 w-3 mr-1" />
                                                    Editar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleDeleteClick(architect.id)}
                                                    disabled={loadingAction === architect.id}
                                                >
                                                    <Trash2 className="h-3 w-3 mr-1" />
                                                    Excluir
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingArchitect ? 'Editar Arquiteto' : 'Novo Arquiteto'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingArchitect
                                ? 'Atualize as informações do arquiteto'
                                : 'Preencha os dados para cadastrar um novo arquiteto'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 pt-4">
                        <div>
                            <Label htmlFor="name">Nome *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Nome completo"
                            />
                        </div>

                        <div>
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="email@exemplo.com"
                            />
                        </div>

                        <div>
                            <Label htmlFor="phone">Telefone</Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="(11) 99999-9999"
                            />
                        </div>

                        <div>
                            <Label htmlFor="document">CPF</Label>
                            <Input
                                id="document"
                                value={formData.document}
                                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                                placeholder="000.000.000-00"
                            />
                        </div>

                        <div>
                            <Label htmlFor="commissionRate">Taxa de Comissão (%)</Label>
                            <Input
                                id="commissionRate"
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={formData.commissionRate}
                                onChange={(e) => setFormData({ ...formData, commissionRate: Number(e.target.value) })}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Percentual sobre vendas vinculadas
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-6">
                        <Button
                            variant="outline"
                            onClick={() => setIsFormDialogOpen(false)}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? 'Salvando...' : editingArchitect ? 'Salvar Alterações' : 'Criar Arquiteto'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir Arquiteto</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir este arquiteto?
                            Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-3 justify-end pt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowDeleteConfirm(false);
                                setDeletingId(null);
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={loadingAction === deletingId}
                        >
                            {loadingAction === deletingId ? 'Excluindo...' : 'Sim, Excluir'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
