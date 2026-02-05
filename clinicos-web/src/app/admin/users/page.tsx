'use client';

import { useState } from 'react';
import { useAdminUsers, AdminUser } from '@/hooks/use-admin-users';
import { useAdminTenants } from '@/hooks/use-admin-tenants';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2, Search, ShieldAlert, UserX, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { EditUserDialog } from './edit-user-dialog';
import { CreateUserDialog } from './create-user-dialog';

export default function UsersPage() {
    const [search, setSearch] = useState('');
    const { users, isLoading, updateUser, createUser } = useAdminUsers(search);
    const { tenants } = useAdminTenants(); // Fetch tenants for assignment
    const [editUser, setEditUser] = useState<AdminUser | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const handleCreate = async (data: any) => {
        try {
            await createUser.mutateAsync(data);
            toast.success('Usuário criado com sucesso!');
            setIsCreateOpen(false);
        } catch (error) {
            toast.error('Erro ao criar usuário.');
            console.error(error);
        }
    };

    const handleEditClick = (user: AdminUser) => {
        setEditUser(user);
        setIsEditOpen(true);
    };

    const handleSave = async (data: any) => {
        try {
            await updateUser.mutateAsync(data);
            toast.success('Usuário atualizado com sucesso!');
            setIsEditOpen(false);
            setEditUser(null);
        } catch (error) {
            toast.error('Erro ao atualizar usuário.');
            console.error(error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gerenciar Usuários</h2>
                    <p className="text-muted-foreground mt-1">Visualize e gerencie todos os usuários do sistema global.</p>
                </div>
            </div>

            <div className="flex items-center space-x-2 max-w-sm">
                <Search className="h-4 w-4 text-slate-500" />
                <Input
                    placeholder="Buscar por nome ou email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1"
                />
            </div>

            <div className="flex justify-end">
                <Button onClick={() => setIsCreateOpen(true)}>
                    <UserCheck className="mr-2 h-4 w-4" /> Novo Usuário
                </Button>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Permissão</TableHead>
                            <TableHead>Vínculos (Lojas)</TableHead>
                            <TableHead>Criado em</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                                </TableCell>
                            </TableRow>
                        ) : users?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                    Nenhum usuário encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            users?.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.name || '-'}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.isActive ? 'default' : 'secondary'} className="flex w-fit items-center gap-1">
                                            {user.isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                                            {user.isActive ? 'Ativo' : 'Desativado'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {user.isSuperAdmin && (
                                            <Badge variant="destructive" className="flex w-fit items-center gap-1">
                                                <ShieldAlert className="h-3 w-3" />
                                                Super Admin
                                            </Badge>
                                        )}
                                        {!user.isSuperAdmin && <span className="text-slate-500 text-sm">Padrão</span>}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                            {user.clinicUsers?.map((cu) => (
                                                <Badge key={cu.clinic.id} variant="outline" className="text-[10px] bg-slate-50">
                                                    {cu.clinic.name}
                                                </Badge>
                                            ))}
                                            {(!user.clinicUsers || user.clinicUsers.length === 0) && <span className="text-xs text-slate-400">-</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm">
                                        {format(new Date(user.createdAt), 'dd/MM/yyyy')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(user)}>
                                            Editar
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <EditUserDialog
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                user={editUser}
                onSave={handleSave}
                isSaving={updateUser.isPending}
                tenants={tenants || []}
            />

            <CreateUserDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSave={handleCreate}
                isSaving={createUser.isPending}
                tenants={tenants || []}
            />
        </div>
    );
}
