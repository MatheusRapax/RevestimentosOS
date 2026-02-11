'use client';

import { useState, useEffect } from 'react';
import { Users, Filter, Plus, X } from 'lucide-react';
import { useProfessionalsAdmin } from '@/hooks/useProfessionalsAdmin';
import { ProfessionalsTable } from '@/components/admin/professionals-table';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';

interface Specialty {
    id: string;
    name: string;
}

export default function ProfessionalsAdminPage() {
    const { professionals, loading, error, activate, deactivate, refetch } =
        useProfessionalsAdmin();
    const [filter, setFilter] = useState<'active' | 'all'>('active');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [inviteForm, setInviteForm] = useState({
        name: '',
        email: '',
        specialtyId: '',
        color: '#3B82F6',
    });
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviting, setInviting] = useState(false);

    useEffect(() => {
        fetchSpecialties();
    }, []);

    const fetchSpecialties = async () => {
        try {
            const response = await api.get('/specialties');
            setSpecialties(response.data);
        } catch (err) {
            console.error('Erro ao carregar especialidades');
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteForm.name.trim() || !inviteForm.email.trim()) return;

        setInviting(true);
        setInviteError(null);

        try {
            await api.post('/professionals/invite', {
                name: inviteForm.name,
                email: inviteForm.email,
                specialtyId: inviteForm.specialtyId || undefined,
                color: inviteForm.color,
            });
            setShowInviteModal(false);
            setInviteForm({ name: '', email: '', specialtyId: '', color: '#3B82F6' });
            refetch();
        } catch (err: any) {
            setInviteError(err.response?.data?.message || 'Erro ao convidar profissional');
        } finally {
            setInviting(false);
        }
    };

    const filteredProfessionals =
        filter === 'active' ? professionals.filter((p) => p.active) : professionals;

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Users className="h-8 w-8" />
                        Gestão de Profissionais
                    </h1>
                    <p className="text-muted-foreground">
                        Gerencie os profissionais da sua loja
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button onClick={() => setShowInviteModal(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Profissional
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Filter className="mr-2 h-4 w-4" />
                                {filter === 'active' ? 'Apenas Ativos' : 'Todos'}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuRadioGroup value={filter} onValueChange={(v) => setFilter(v as any)}>
                                <DropdownMenuRadioItem value="active">Apenas Ativos</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>
                        {error.message === 'Request failed with status code 403'
                            ? 'Você não tem permissão para acessar esta página'
                            : 'Erro ao carregar profissionais. Tente novamente.'}
                    </AlertDescription>
                </Alert>
            )}

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">Adicionar Profissional</h2>
                            <Button variant="ghost" size="sm" onClick={() => setShowInviteModal(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {inviteError && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertDescription>{inviteError}</AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nome *</label>
                                <input
                                    type="text"
                                    value={inviteForm.name}
                                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-md"
                                    placeholder="Nome completo"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={inviteForm.email}
                                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-md"
                                    placeholder="email@exemplo.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Especialidade</label>
                                <select
                                    value={inviteForm.specialtyId}
                                    onChange={(e) => setInviteForm({ ...inviteForm, specialtyId: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-md"
                                >
                                    <option value="">Selecione...</option>
                                    {specialties.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Cor na Agenda</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={inviteForm.color}
                                        onChange={(e) => setInviteForm({ ...inviteForm, color: e.target.value })}
                                        className="w-10 h-10 rounded cursor-pointer"
                                    />
                                    <span className="text-sm text-gray-500">{inviteForm.color}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button type="submit" className="flex-1" disabled={inviting}>
                                    {inviting ? 'Adicionando...' : 'Adicionar'}
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setShowInviteModal(false)}>
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Table */}
            <ProfessionalsTable
                professionals={filteredProfessionals}
                loading={loading}
                onActivate={activate}
                onDeactivate={deactivate}
                onRefresh={refetch}
            />

            {/* Stats */}
            {!loading && !error && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                        Total: <strong>{professionals.length}</strong>
                    </span>
                    <span>
                        Ativos: <strong>{professionals.filter((p) => p.active).length}</strong>
                    </span>
                    <span>
                        Inativos: <strong>{professionals.filter((p) => !p.active).length}</strong>
                    </span>
                </div>
            )}
        </div>
    );
}
