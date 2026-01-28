'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Users, Edit, Trash2, Search, Building, User } from 'lucide-react';

interface Customer {
    id: string;
    name: string;
    type: 'PF' | 'PJ';
    email?: string;
    phone?: string;
    document?: string;
    stateRegistration?: string;
    city?: string;
    state?: string;
    isActive: boolean;
    architect?: { id: string; name: string } | null;
    createdAt: string;
    updatedAt: string;
}

export default function ClientesPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'PF' | 'PJ'>('ALL');

    // Create dialog
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    // Delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Loading state for actions
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

    useEffect(() => {
        fetchCustomers();
    }, [filterType]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== '') fetchCustomers();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Auto-dismiss success message
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const handleDeleteClick = (customerId: string) => {
        setDeletingId(customerId);
        setShowDeleteConfirm(true);
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
            setError(err.response?.data?.message || 'Erro ao excluir cliente');
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
                <Button onClick={() => setIsCreateDialogOpen(true)}>
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
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
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
