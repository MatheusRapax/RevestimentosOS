'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
    Plus,
    Search,
    Building2,
    Phone,
    Mail,
    MapPin,
    Edit,
    Trash2,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';

interface Supplier {
    id: string;
    name: string;
    cnpj?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    notes?: string;
    isActive: boolean;
    createdAt: string;
}

export default function FornecedoresPage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        cnpj: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        notes: '',
    });

    // Fetch suppliers
    const { data: suppliers = [], isLoading } = useQuery({
        queryKey: ['suppliers', showInactive],
        queryFn: async () => {
            const response = await api.get('/suppliers', {
                params: showInactive ? {} : { isActive: 'true' }
            });
            return response.data;
        }
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            await api.post('/suppliers', data);
        },
        onSuccess: () => {
            toast.success('Fornecedor criado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            closeDialog();
        },
        onError: () => toast.error('Erro ao criar fornecedor')
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
            await api.patch(`/suppliers/${id}`, data);
        },
        onSuccess: () => {
            toast.success('Fornecedor atualizado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            closeDialog();
        },
        onError: () => toast.error('Erro ao atualizar fornecedor')
    });

    // Toggle active mutation
    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            await api.patch(`/suppliers/${id}`, { isActive });
        },
        onSuccess: () => {
            toast.success('Status atualizado!');
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        },
        onError: () => toast.error('Erro ao atualizar status')
    });

    const openCreateDialog = () => {
        setEditingSupplier(null);
        setFormData({
            name: '',
            cnpj: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            state: '',
            notes: '',
        });
        setIsDialogOpen(true);
    };

    const openEditDialog = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setFormData({
            name: supplier.name,
            cnpj: supplier.cnpj || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            address: supplier.address || '',
            city: supplier.city || '',
            state: supplier.state || '',
            notes: supplier.notes || '',
        });
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingSupplier(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('Nome é obrigatório');
            return;
        }

        if (editingSupplier) {
            updateMutation.mutate({ id: editingSupplier.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const filteredSuppliers = suppliers.filter((supplier: Supplier) =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.cnpj?.includes(searchTerm) ||
        supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
                    <p className="text-gray-500">Gerencie os fornecedores de produtos</p>
                </div>
                <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Fornecedor
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total</p>
                            <p className="text-2xl font-bold">{suppliers.length}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <ToggleRight className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Ativos</p>
                            <p className="text-2xl font-bold">
                                {suppliers.filter((s: Supplier) => s.isActive).length}
                            </p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <ToggleLeft className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Inativos</p>
                            <p className="text-2xl font-bold">
                                {suppliers.filter((s: Supplier) => !s.isActive).length}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        placeholder="Buscar por nome, CNPJ ou email..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button
                    variant={showInactive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowInactive(!showInactive)}
                >
                    {showInactive ? 'Mostrar Todos' : 'Mostrar Inativos'}
                </Button>
            </div>

            {/* Table */}
            <Card>
                {isLoading ? (
                    <div className="p-8 text-center text-gray-500">Carregando...</div>
                ) : filteredSuppliers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        Nenhum fornecedor encontrado
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>CNPJ</TableHead>
                                <TableHead>Contato</TableHead>
                                <TableHead>Cidade/UF</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSuppliers.map((supplier: Supplier) => (
                                <TableRow key={supplier.id}>
                                    <TableCell className="font-medium">{supplier.name}</TableCell>
                                    <TableCell>{supplier.cnpj || '-'}</TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            {supplier.phone && (
                                                <div className="flex items-center gap-1 text-sm">
                                                    <Phone className="h-3 w-3" />
                                                    {supplier.phone}
                                                </div>
                                            )}
                                            {supplier.email && (
                                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                                    <Mail className="h-3 w-3" />
                                                    {supplier.email}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {supplier.city && supplier.state ? (
                                            <div className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {supplier.city}/{supplier.state}
                                            </div>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${supplier.isActive
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {supplier.isActive ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEditDialog(supplier)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => toggleActiveMutation.mutate({
                                                    id: supplier.id,
                                                    isActive: !supplier.isActive
                                                })}
                                            >
                                                {supplier.isActive ? (
                                                    <ToggleRight className="h-4 w-4 text-green-600" />
                                                ) : (
                                                    <ToggleLeft className="h-4 w-4 text-gray-400" />
                                                )}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            {/* Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Nome *</label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Nome do fornecedor"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">CNPJ</label>
                            <Input
                                value={formData.cnpj}
                                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                                placeholder="00.000.000/0000-00"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="email@exemplo.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Telefone</label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Endereço</label>
                            <Input
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Rua, número, bairro"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Cidade</label>
                                <Input
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder="Cidade"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">UF</label>
                                <Input
                                    value={formData.state}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                    placeholder="SP"
                                    maxLength={2}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Observações</label>
                            <textarea
                                className="w-full border rounded-md p-2 text-sm"
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Observações sobre o fornecedor"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={closeDialog}>
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={createMutation.isPending || updateMutation.isPending}
                            >
                                {(createMutation.isPending || updateMutation.isPending)
                                    ? 'Salvando...'
                                    : 'Salvar'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
