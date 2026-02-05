
'use client';

import { useState } from 'react';
import { useAdminRoles, Role } from '@/hooks/use-admin-roles';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Key, Users, Shield } from 'lucide-react';
import { RoleDialog } from './role-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function RolesPage() {
    const { roles, permissions, isLoading, createRole, updateRole, deleteRole } = useAdminRoles();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | undefined>(undefined);

    const handleCreate = () => {
        setEditingRole(undefined);
        setIsDialogOpen(true);
    };

    const handleEdit = (role: Role) => {
        setEditingRole(role);
        setIsDialogOpen(true);
    };

    const handleDelete = async (role: Role) => {
        if (confirm(`Tem certeza que deseja excluir o papel "${role.name}"?`)) {
            try {
                await deleteRole(role.id);
            } catch (e: any) {
                alert(e.response?.data?.message || 'Erro ao excluir');
            }
        }
    };

    const handleSave = async (data: any) => {
        if (editingRole) {
            await updateRole({ id: editingRole.id, data });
        } else {
            await createRole(data);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Papéis e Permissões</h1>
                    <p className="text-slate-500">Gerencie roles globais e suas permissões de acesso.</p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Papel
                </Button>
            </div>

            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {roles.map(role => (
                        <div key={role.id} className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <Shield className="h-5 w-5" />
                                </div>
                                <Badge variant="outline" className="font-mono text-xs">
                                    {role.key}
                                </Badge>
                            </div>

                            <h3 className="font-semibold text-lg text-slate-900">{role.name}</h3>
                            <p className="text-sm text-slate-500 mb-4 line-clamp-2 min-h-[40px]">
                                {role.description || 'Sem descrição definida.'}
                            </p>

                            <div className="mt-auto pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Key className="h-4 w-4 text-slate-400" />
                                    <span>{role._count?.rolePermissions || 0} Permissões</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Users className="h-4 w-4 text-slate-400" />
                                    <span>{role._count?.clinicUsers || 0} Usuários</span>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-4">
                                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(role)}>
                                    <Pencil className="h-3 w-3 mr-2" />
                                    Editar
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDelete(role)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <RoleDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                role={editingRole}
                allPermissions={permissions}
                onSave={handleSave}
            />
        </div>
    );
}
