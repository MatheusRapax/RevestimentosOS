'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Users, Shield, Check } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useCommissions } from '@/hooks/useCommissions';

interface ClinicUser {
    id: string;
    name: string;
    email: string;
    active: boolean;
    roleId: string;
    roleKey: string;
    roleName: string;
    commissionRuleId?: string;
}

interface Role {
    id: string;
    key: string;
    name: string;
}

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function UsersPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<ClinicUser[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Modal state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [newUserForm, setNewUserForm] = useState({
        name: '',
        email: '',
        password: '',
        roleId: '',
        commissionRuleId: '',
    });

    const { rules } = useCommissions();
    const sellerRules = rules.filter((r) => r.targetType === 'SELLER');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, rolesRes] = await Promise.all([
                api.get('/professionals/users'),
                api.get('/roles'),
            ]);
            setUsers(usersRes.data);
            
            // Filters out SUPER_ADMIN for role assignments in the modal
            const filteredRoles = rolesRes.data.filter((r: Role) => r.key !== 'SUPER_ADMIN');
            setRoles(filteredRoles);
            
            if (filteredRoles.length > 0 && !newUserForm.roleId) {
                setNewUserForm(prev => ({ ...prev, roleId: filteredRoles[0].id }));
            }
            
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

    const handleRoleChange = async (user: ClinicUser, newRoleId: string) => {
        setSaving(user.id);
        setSuccess(null);
        try {
            await api.put(`/professionals/${user.id}/role`, { 
                roleId: newRoleId, 
                commissionRuleId: user.commissionRuleId 
            });
            setSuccess(user.id);
            setTimeout(() => setSuccess(null), 2000);
            await fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao alterar papel');
        } finally {
            setSaving(null);
        }
    };

    const handleCommissionRuleChange = async (user: ClinicUser, commissionRuleId: string) => {
        setSaving(user.id);
        setSuccess(null);
        try {
            await api.put(`/professionals/${user.id}/role`, { 
                roleId: user.roleId, 
                commissionRuleId: commissionRuleId === 'null' ? null : commissionRuleId 
            });
            setSuccess(user.id);
            setTimeout(() => setSuccess(null), 2000);
            await fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao alterar comissão');
        } finally {
            setSaving(null);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!newUserForm.name || !newUserForm.email || !newUserForm.password || !newUserForm.roleId) {
            toast.error('Preencha todos os campos obrigatórios.');
            return;
        }

        setIsAddingUser(true);
        try {
            await api.post('/professionals/invite', {
                name: newUserForm.name,
                email: newUserForm.email,
                password: newUserForm.password,
                roleId: newUserForm.roleId,
                commissionRuleId: newUserForm.commissionRuleId || undefined,
            });
            
            toast.success('Usuário criado com sucesso!');
            setIsAddModalOpen(false);
            setNewUserForm({ name: '', email: '', password: '', roleId: roles.length > 0 ? roles[0].id : '', commissionRuleId: '' });
            await fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao criar usuário');
        } finally {
            setIsAddingUser(false);
        }
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
                        <Users className="h-6 w-6" />
                        Usuários da Loja
                    </h1>
                    <p className="text-gray-500">Gerencie os usuários e seus papéis no sistema</p>
                </div>

                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            Adicionar Usuário
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <form onSubmit={handleAddUser}>
                            <DialogHeader>
                                <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                                <DialogDescription>
                                    Crie um novo acesso para a sua loja. O usuário será adicionado com o papel selecionado.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nome completo</Label>
                                    <Input
                                        id="name"
                                        placeholder="Ex: João da Silva"
                                        value={newUserForm.name}
                                        onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                                        disabled={isAddingUser}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="Ex: joao@email.com"
                                        value={newUserForm.email}
                                        onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                                        disabled={isAddingUser}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Senha Inicial</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Min. 6 caracteres"
                                        value={newUserForm.password}
                                        onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                                        disabled={isAddingUser}
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="role">Papel (Permissões)</Label>
                                    <select
                                        id="role"
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={newUserForm.roleId}
                                        onChange={(e) => setNewUserForm({ ...newUserForm, roleId: e.target.value })}
                                        disabled={isAddingUser}
                                        required
                                    >
                                        <option value="" disabled>Selecione um papel</option>
                                        {roles.map((role) => (
                                            <option key={role.id} value={role.id}>
                                                {role.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {roles.find(r => r.id === newUserForm.roleId)?.key === 'SELLER' && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="commissionRuleId">Regra de Comissão</Label>
                                        <select
                                            id="commissionRuleId"
                                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={newUserForm.commissionRuleId || ''}
                                            onChange={(e) => setNewUserForm({ ...newUserForm, commissionRuleId: e.target.value })}
                                            disabled={isAddingUser}
                                        >
                                            <option value="">Padrão (Regra Global de Vendedores)</option>
                                            {sellerRules.filter((r: any) => !r.isGlobal).map((rule: any) => (
                                                <option key={rule.id} value={rule.id}>
                                                    {rule.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsAddModalOpen(false)}
                                    disabled={isAddingUser}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={isAddingUser} className="bg-blue-600 hover:bg-blue-700">
                                    {isAddingUser ? 'Adicionando...' : 'Adicionar Usuário'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Usuários e Papéis Atuais
                    </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Papel</TableHead>
                                <TableHead>Regra de Comissão</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => {
                                const isCurrentUser = user.id === currentUser?.id;
                                const isSaving = saving === user.id;
                                const isSuccess = success === user.id;

                                return (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium whitespace-nowrap">
                                            {user.name}
                                            {isCurrentUser && (
                                                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                    você
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-gray-500 whitespace-nowrap">
                                            {user.email}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${user.active
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                                    }`}
                                            >
                                                {user.active ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <select
                                                value={user.roleId}
                                                onChange={(e) =>
                                                    handleRoleChange(user, e.target.value)
                                                }
                                                disabled={isCurrentUser || isSaving || user.roleKey === 'SUPER_ADMIN'}
                                                className={`px-3 py-1.5 border rounded-md text-sm min-w-[140px] ${isCurrentUser || user.roleKey === 'SUPER_ADMIN'
                                                    ? 'bg-gray-100 cursor-not-allowed'
                                                    : 'cursor-pointer hover:border-blue-400'
                                                    }`}
                                            >
                                                {/* Se o usuário for Super Admin e os roles normais não tiverem, adiciona dinamicamente na lista pra não quebrar o select */}
                                                {!roles.find(r => r.id === user.roleId) && user.roleKey === 'SUPER_ADMIN' && (
                                                    <option value={user.roleId}>{user.roleName}</option>
                                                )}
                                                {roles.map((role) => (
                                                    <option key={role.id} value={role.id}>
                                                        {role.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </TableCell>
                                        <TableCell>
                                            {user.roleKey === 'SELLER' ? (
                                                <select
                                                    value={user.commissionRuleId || 'null'}
                                                    onChange={(e) =>
                                                        handleCommissionRuleChange(user, e.target.value)
                                                    }
                                                    disabled={isCurrentUser || isSaving}
                                                    className={`px-3 py-1.5 border rounded-md text-sm min-w-[140px] ${isCurrentUser
                                                        ? 'bg-gray-100 cursor-not-allowed'
                                                        : 'cursor-pointer hover:border-blue-400'
                                                        }`}
                                                >
                                                    <option value="null">Padrão da Loja</option>
                                                    {sellerRules.filter((r: any) => !r.isGlobal).map((rule: any) => (
                                                        <option key={rule.id} value={rule.id}>
                                                            {rule.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className="text-gray-400 text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isSaving && (
                                                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                            )}
                                            {isSuccess && (
                                                <Check className="h-4 w-4 text-green-500" />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
