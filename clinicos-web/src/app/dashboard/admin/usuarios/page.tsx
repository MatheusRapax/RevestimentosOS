'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface ClinicUser {
    id: string;
    name: string;
    email: string;
    active: boolean;
    roleId: string;
    roleKey: string;
    roleName: string;
}

interface Role {
    id: string;
    key: string;
    name: string;
}

export default function UsersPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<ClinicUser[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, rolesRes] = await Promise.all([
                api.get('/professionals/users'),
                api.get('/roles'),
            ]);
            setUsers(usersRes.data);
            setRoles(rolesRes.data);
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

    const handleRoleChange = async (userId: string, roleId: string) => {
        setSaving(userId);
        setSuccess(null);
        try {
            await api.put(`/professionals/${userId}/role`, { roleId });
            setSuccess(userId);
            setTimeout(() => setSuccess(null), 2000);
            await fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Erro ao alterar papel');
        } finally {
            setSaving(null);
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
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Users className="h-6 w-6" />
                    Usuários da Clínica
                </h1>
                <p className="text-gray-500">Gerencie os papéis de cada usuário</p>
            </div>

            {/* Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Usuários e Papéis
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Papel</TableHead>
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
                                        <TableCell className="font-medium">
                                            {user.name}
                                            {isCurrentUser && (
                                                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                    você
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-gray-500">
                                            {user.email}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`text-xs px-2 py-1 rounded-full ${user.active
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
                                                    handleRoleChange(user.id, e.target.value)
                                                }
                                                disabled={isCurrentUser || isSaving}
                                                className={`px-3 py-1.5 border rounded-md text-sm ${isCurrentUser
                                                        ? 'bg-gray-100 cursor-not-allowed'
                                                        : 'cursor-pointer hover:border-blue-400'
                                                    }`}
                                            >
                                                {roles.map((role) => (
                                                    <option key={role.id} value={role.id}>
                                                        {role.name}
                                                    </option>
                                                ))}
                                            </select>
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
