'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
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
import { Shield, Edit, Users, Check, X } from 'lucide-react';
import api from '@/lib/api';

interface Permission {
    id: string;
    key: string;
    description: string | null;
}

interface Role {
    id: string;
    key: string;
    name: string;
    description: string | null;
    rolePermissions: Array<{
        permission: Permission;
    }>;
}

export default function RolesPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Edit modal state
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [rolesRes, permissionsRes] = await Promise.all([
                api.get('/roles'),
                api.get('/roles/permissions/all'),
            ]);
            setRoles(rolesRes.data);
            setAllPermissions(permissionsRes.data);
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

    const openEditModal = (role: Role) => {
        setEditingRole(role);
        setSelectedPermissions(
            new Set(role.rolePermissions.map((rp) => rp.permission.id))
        );
    };

    const togglePermission = (permissionId: string) => {
        const newSet = new Set(selectedPermissions);
        if (newSet.has(permissionId)) {
            newSet.delete(permissionId);
        } else {
            newSet.add(permissionId);
        }
        setSelectedPermissions(newSet);
    };

    const savePermissions = async () => {
        if (!editingRole) return;
        setSaving(true);
        try {
            await api.put(`/roles/${editingRole.id}/permissions`, {
                permissionIds: Array.from(selectedPermissions),
            });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2000);
            await fetchData();
            setEditingRole(null);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao salvar');
        } finally {
            setSaving(false);
        }
    };

    // Add role modal state
    const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
    const [isAddingRole, setIsAddingRole] = useState(false);
    const [newRoleForm, setNewRoleForm] = useState({
        name: '',
        description: '',
    });

    const groupedPermissions = allPermissions.reduce((acc, perm) => {
        const category = perm.key.includes('.')
            ? perm.key.split('.')[0]
            : perm.key.includes('_')
                ? perm.key.split('_')[0].toLowerCase()
                : 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);

    const handleAddRole = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!newRoleForm.name) {
            toast.error('O nome do papel é obrigatório.');
            return;
        }

        setIsAddingRole(true);
        try {
            await api.post('/roles', {
                name: newRoleForm.name,
                description: newRoleForm.description,
            });
            
            toast.success('Papel criado com sucesso!');
            setIsAddRoleModalOpen(false);
            setNewRoleForm({ name: '', description: '' });
            await fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao criar papel');
        } finally {
            setIsAddingRole(false);
        }
    };

    const categoryNames: Record<string, string> = {
        appointment: 'Agendamentos',
        patient: 'Clientes',
        encounter: 'Atendimentos',
        record: 'Prontuário',
        procedure: 'Procedimentos',
        consumable: 'Consumíveis',
        stock: 'Estoque',
        clinic: 'Loja',
        user: 'Usuários',
        schedule: 'Agenda',
        notice: 'Avisos',
        specialty: 'Especialidades',
        role: 'Papéis',
        audit: 'Auditoria',
        finance: 'Financeiro',
        professional: 'Profissionais',
        promotion: 'Promoções',
        other: 'Outros',
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="h-6 w-6" />
                        Papéis e Acessos
                    </h1>
                    <p className="text-gray-500">Gerencie as permissões de cada papel</p>
                </div>

                <Dialog open={isAddRoleModalOpen} onOpenChange={setIsAddRoleModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            Novo Papel
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <form onSubmit={handleAddRole}>
                            <DialogHeader>
                                <DialogTitle>Criar Novo Papel</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        Nome do Papel
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="Ex: Auxiliar Administrativo"
                                        value={newRoleForm.name}
                                        onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                                        disabled={isAddingRole}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <label htmlFor="description" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        Descrição (Opcional)
                                    </label>
                                    <input
                                        id="description"
                                        type="text"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="Breve descrição do acesso"
                                        value={newRoleForm.description}
                                        onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                                        disabled={isAddingRole}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsAddRoleModalOpen(false)}
                                    disabled={isAddingRole}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isAddingRole} className="bg-blue-600 hover:bg-blue-700">
                                    {isAddingRole ? 'Criando...' : 'Criar Papel'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {success && (
                <Alert className="bg-green-50 border-green-200">
                    <AlertDescription className="text-green-700">
                        Permissões salvas com sucesso!
                    </AlertDescription>
                </Alert>
            )}

            {/* Roles Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Papéis do Sistema
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Chave</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead className="text-center">Permissões</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {roles.map((role) => (
                                <TableRow key={role.id}>
                                    <TableCell className="font-medium">{role.name}</TableCell>
                                    <TableCell>
                                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                                            {role.key}
                                        </code>
                                    </TableCell>
                                    <TableCell className="text-gray-500">
                                        {role.description || '-'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {role.rolePermissions.length} permissões
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openEditModal(role)}
                                        >
                                            <Edit className="h-4 w-4 mr-1" />
                                            Editar
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Edit Permissions Modal */}
            <Dialog open={!!editingRole} onOpenChange={() => setEditingRole(null)}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Editar Permissões - {editingRole?.name}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {Object.entries(groupedPermissions).map(([category, perms]) => (
                            <div key={category} className="space-y-2">
                                <h3 className="font-semibold text-gray-900 capitalize">
                                    {categoryNames[category] || category}
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {perms.map((perm) => (
                                        <label
                                            key={perm.id}
                                            className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${selectedPermissions.has(perm.id)
                                                ? 'bg-blue-50 border-blue-300'
                                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedPermissions.has(perm.id)}
                                                onChange={() => togglePermission(perm.id)}
                                                className="w-4 h-4"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <code className="text-xs text-gray-600 block truncate">
                                                    {perm.key}
                                                </code>
                                                {perm.description && (
                                                    <span className="text-xs text-gray-500 block truncate">
                                                        {perm.description}
                                                    </span>
                                                )}
                                            </div>
                                            {selectedPermissions.has(perm.id) ? (
                                                <Check className="h-4 w-4 text-blue-600" />
                                            ) : (
                                                <X className="h-4 w-4 text-gray-300" />
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingRole(null)}>
                            Cancelar
                        </Button>
                        <Button onClick={savePermissions} disabled={saving}>
                            {saving ? 'Salvando...' : 'Salvar Permissões'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
