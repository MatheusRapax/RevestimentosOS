'use client';

import { useState, useEffect } from 'react';
import { Briefcase, Plus, Pencil, Trash2, X } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Specialty {
    id: string;
    name: string;
    createdAt: string;
}

export default function SpecialtiesPage() {
    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formName, setFormName] = useState('');

    useEffect(() => {
        fetchSpecialties();
    }, []);

    const fetchSpecialties = async () => {
        try {
            setLoading(true);
            const response = await api.get('/specialties');
            setSpecialties(response.data);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao carregar especialidades');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName.trim()) return;

        try {
            if (editingId) {
                await api.patch(`/specialties/${editingId}`, { name: formName });
            } else {
                await api.post('/specialties', { name: formName });
            }
            setFormName('');
            setShowForm(false);
            setEditingId(null);
            fetchSpecialties();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao salvar especialidade');
        }
    };

    const handleEdit = (specialty: Specialty) => {
        setFormName(specialty.name);
        setEditingId(specialty.id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja remover esta especialidade?')) return;

        try {
            await api.delete(`/specialties/${id}`);
            fetchSpecialties();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao remover especialidade');
        }
    };

    const cancelForm = () => {
        setShowForm(false);
        setEditingId(null);
        setFormName('');
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Briefcase className="h-8 w-8" />
                        Especialidades
                    </h1>
                    <p className="text-muted-foreground">
                        Cadastre as especialidades dos profissionais
                    </p>
                </div>

                <Button onClick={() => setShowForm(true)} disabled={showForm}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Especialidade
                </Button>
            </div>

            {/* Error */}
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Form */}
            {showForm && (
                <div className="bg-white border rounded-lg p-4 shadow-sm">
                    <form onSubmit={handleSubmit} className="flex items-center gap-4">
                        <input
                            type="text"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            placeholder="Nome da especialidade"
                            className="flex-1 px-3 py-2 border rounded-md"
                            autoFocus
                        />
                        <Button type="submit">
                            {editingId ? 'Atualizar' : 'Adicionar'}
                        </Button>
                        <Button type="button" variant="ghost" onClick={cancelForm}>
                            <X className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            )}

            {/* Table */}
            <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Nome</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                                    Carregando...
                                </td>
                            </tr>
                        ) : specialties.length === 0 ? (
                            <tr>
                                <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                                    Nenhuma especialidade cadastrada
                                </td>
                            </tr>
                        ) : (
                            specialties.map((specialty) => (
                                <tr key={specialty.id} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3">{specialty.name}</td>
                                    <td className="px-4 py-3 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(specialty)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(specialty.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Stats */}
            {!loading && (
                <p className="text-sm text-muted-foreground">
                    Total: <strong>{specialties.length}</strong> especialidade(s)
                </p>
            )}
        </div>
    );
}
