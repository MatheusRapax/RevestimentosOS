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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, Users, Edit, Trash2, Search, Building, User } from 'lucide-react';
import { maskCPF, maskCNPJ, maskPhone, maskCEP, maskDate, unmask } from '@/lib/masks';

interface Customer {
    id: string;
    name: string;
    type: 'PF' | 'PJ';
    email?: string;
    phone?: string;
    document?: string;
    stateRegistration?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    birthDate?: string;
    isActive: boolean;
    architectId?: string;
    architect?: { id: string; name: string } | null;
    createdAt: string;
    updatedAt: string;
}

interface Architect {
    id: string;
    name: string;
}

const emptyForm = {
    name: '',
    type: 'PF' as 'PF' | 'PJ',
    email: '',
    phone: '',
    document: '',
    stateRegistration: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    state: '',
    zipCode: '',
    birthDate: '',
    architectId: '',
};

export default function ClientesPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [architects, setArchitects] = useState<Architect[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'PF' | 'PJ'>('ALL');

    // Create/Edit dialog
    const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [formData, setFormData] = useState(emptyForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    // Delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    const fetchCustomers = async () => {
        try {
            setIsLoading(true);
            setError('');
            const params: any = {};
            if (searchTerm) params.name = searchTerm;
            if (filterType !== 'ALL') params.type = filterType;

            const response = await api.get('/customers', { params });
            setCustomers(response.data);
        } catch (err: any) {
            console.error('Error fetching customers:', err);
            setError('Erro ao carregar clientes');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchArchitects = async () => {
        try {
            const response = await api.get('/architects');
            setArchitects(response.data);
        } catch (err) {
            console.error('Error fetching architects:', err);
        }
    };

    useEffect(() => {
        fetchCustomers();
        fetchArchitects();
    }, [filterType]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== '') fetchCustomers();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const openCreateDialog = () => {
        setEditingCustomer(null);
        setFormData(emptyForm);
        setFormError('');
        setIsFormDialogOpen(true);
    };

    const openEditDialog = (customer: Customer) => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name || '',
            type: customer.type,
            email: customer.email || '',
            phone: customer.phone || '',
            document: customer.document || '',
            stateRegistration: customer.stateRegistration || '',
            address: customer.address || '',
            city: customer.city || '',
            state: customer.state || '',
            zipCode: customer.zipCode || '',
            zipCode: customer.zipCode || '',
            birthDate: customer.birthDate ? new Date(customer.birthDate).toLocaleDateString('pt-BR') : '',
            architectId: customer.architectId || '',
        });
        setFormError('');
        setIsFormDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            setFormError('Nome é obrigatório');
            return;
        }

        try {
            setIsSubmitting(true);
            setFormError('');

            const payload = {
                ...formData,
                ...formData,
                document: unmask(formData.document),
                phone: unmask(formData.phone),
                zipCode: unmask(formData.zipCode),
                birthDate: formData.birthDate ? new Date(formData.birthDate.split('/').reverse().join('-')).toISOString() : undefined,
                architectId: formData.architectId && formData.architectId !== 'none' ? formData.architectId : undefined,
            };

            if (editingCustomer) {
                await api.put(`/customers/${editingCustomer.id}`, payload);
                setSuccessMessage('Cliente atualizado com sucesso!');
            } else {
                await api.post('/customers', payload);
                setSuccessMessage('Cliente criado com sucesso!');
            }

            setIsFormDialogOpen(false);
            fetchCustomers();
        } catch (err: any) {
            console.error('Error saving customer:', err);
            setFormError(err.response?.data?.message || 'Erro ao salvar cliente');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (customerId: string) => {
        setDeletingId(customerId);
        setShowDeleteConfirm(true);
        setFormError(''); // Clear errors when opening dialog
    };

    const confirmDelete = async () => {
        if (!deletingId) return;

        try {
            setLoadingAction(deletingId);
            await api.delete(`/customers/${deletingId}`);
            setCustomers(prev => prev.filter(c => c.id !== deletingId));
            setShowDeleteConfirm(false);
            setDeletingId(null);
            setSuccessMessage('Cliente excluído com sucesso!');
        } catch (err: any) {
            console.error('Error deleting customer:', err);
            // Show error in delete dialog if possible, or main page error
            // For now, let's use the main page error for deleting since we don't have a specific state for delete dialog error in this version,
            // oh wait, I see I passed `formError` to Delete confirmation in my previous attempt. Let's reuse `formError` for delete dialog too since they are mutually exclusive.
            setFormError(err.response?.data?.message || 'Erro ao excluir cliente');
        } finally {
            setLoadingAction(null);
        }
    };

    const getTypeBadge = (type: 'PF' | 'PJ') => {
        if (type === 'PJ') {
            return (
                <span className="px-2 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    <Building className="h-3 w-3" />
                    PJ
                </span>
            );
        }
        return (
            <span className="px-2 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                <User className="h-3 w-3" />
                PF
            </span>
        );
    };

    const getStatusBadge = (isActive: boolean) => {
        if (isActive) {
            return (
                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">
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

    if (isLoading && customers.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg text-gray-600">Carregando clientes...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
                    <p className="text-gray-600 mt-1">Gerencie o cadastro de clientes (PF e PJ)</p>
                </div>
                <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Cliente
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar por nome..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={filterType === 'ALL' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterType('ALL')}
                    >
                        Todos
                    </Button>
                    <Button
                        variant={filterType === 'PF' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterType('PF')}
                    >
                        <User className="h-4 w-4 mr-1" />
                        PF
                    </Button>
                    <Button
                        variant={filterType === 'PJ' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterType('PJ')}
                    >
                        <Building className="h-4 w-4 mr-1" />
                        PJ
                    </Button>
                </div>
            </div>

            {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
                    {successMessage}
                </div>
            )}

            {error && (
                <div className="rounded-lg bg-red-50 p-4">
                    <p className="text-red-600">{error}</p>
                    <Button onClick={fetchCustomers} className="mt-4" variant="outline">
                        Tentar novamente
                    </Button>
                </div>
            )}

            {customers.length === 0 ? (
                <Card className="p-12 text-center">
                    <div className="text-gray-400 mb-4">
                        <Users className="h-16 w-16 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Nenhum cliente cadastrado
                    </h3>
                    <p className="text-gray-600 mb-4">
                        Comece adicionando um novo cliente
                    </p>
                    <Button onClick={openCreateDialog}>
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Cliente
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
                                        Tipo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Documento
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Telefone
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Arquiteto
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
                                {customers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {customer.name}
                                                </div>
                                                {customer.email && (
                                                    <div className="text-sm text-gray-500">
                                                        {customer.email}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getTypeBadge(customer.type)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {customer.document || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {customer.phone || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {customer.architect?.name || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(customer.isActive)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openEditDialog(customer)}
                                                    disabled={loadingAction === customer.id}
                                                >
                                                    <Edit className="h-3 w-3 mr-1" />
                                                    Editar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleDeleteClick(customer.id)}
                                                    disabled={loadingAction === customer.id}
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
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingCustomer
                                ? 'Atualize as informações do cliente'
                                : 'Preencha os dados para cadastrar um novo cliente'}
                        </DialogDescription>
                    </DialogHeader>

                    {formError && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm mb-4">
                            {formError}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="col-span-2">
                            <Label htmlFor="name">Nome <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Nome completo ou razão social"
                            />
                        </div>

                        <div>
                            <Label htmlFor="type">Tipo</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(v) => setFormData({ ...formData, type: v as 'PF' | 'PJ' })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PF">Pessoa Física</SelectItem>
                                    <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="document">
                                {formData.type === 'PF' ? 'CPF' : 'CNPJ'}
                            </Label>
                            <Input
                                id="document"
                                value={formData.document}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    const masked = formData.type === 'PF' ? maskCPF(value) : maskCNPJ(value);
                                    setFormData({ ...formData, document: masked });
                                }}
                                placeholder={formData.type === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'}
                            />
                        </div>

                        {formData.type === 'PF' && (
                            <div>
                                <Label htmlFor="birthDate">Data de Nascimento</Label>
                                <Input
                                    id="birthDate"
                                    value={formData.birthDate || ''}
                                    onChange={(e) => setFormData({ ...formData, birthDate: maskDate(e.target.value) })}
                                    placeholder="DD/MM/AAAA"
                                    maxLength={10}
                                />
                            </div>
                        )}

                        {formData.type === 'PJ' && (
                            <div>
                                <Label htmlFor="stateRegistration">Inscrição Estadual</Label>
                                <Input
                                    id="stateRegistration"
                                    value={formData.stateRegistration}
                                    onChange={(e) => setFormData({ ...formData, stateRegistration: e.target.value })}
                                />
                            </div>
                        )}

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
                                onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                                placeholder="(11) 99999-9999"
                                maxLength={15}
                            />
                        </div>

                        <div className="col-span-2">
                            <Label htmlFor="address">Endereço</Label>
                            <Input
                                id="address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Rua, número, complemento"
                            />
                        </div>

                        <div>
                            <Label htmlFor="city">Cidade</Label>
                            <Input
                                id="city"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label htmlFor="state">Estado</Label>
                            <Input
                                id="state"
                                value={formData.state}
                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                placeholder="SP"
                                maxLength={2}
                            />
                        </div>

                        <div>
                            <Label htmlFor="zipCode">CEP</Label>
                            <Input
                                id="zipCode"
                                value={formData.zipCode}
                                onChange={(e) => setFormData({ ...formData, zipCode: maskCEP(e.target.value) })}
                                placeholder="00000-000"
                                maxLength={9}
                            />
                        </div>

                        <div>
                            <Label htmlFor="architect">Arquiteto Vinculado</Label>
                            <Select
                                value={formData.architectId || 'none'}
                                onValueChange={(v) => setFormData({ ...formData, architectId: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione (opcional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhum</SelectItem>
                                    {architects.map((arch) => (
                                        <SelectItem key={arch.id} value={arch.id}>
                                            {arch.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                            {isSubmitting ? 'Salvando...' : editingCustomer ? 'Salvar Alterações' : 'Criar Cliente'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir Cliente</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir este cliente?
                            Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    {formError && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm mb-4">
                            {formError}
                        </div>
                    )}
                    <div className="flex gap-3 justify-end pt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowDeleteConfirm(false);
                                setDeletingId(null);
                                setFormError('');
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
