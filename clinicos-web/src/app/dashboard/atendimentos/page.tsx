'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Plus, FileText, Edit, Trash2, Eye, Clock, CheckCircle } from 'lucide-react';
import CreateEncounterDialog from '@/components/encounters/create-encounter-dialog';
import EditEncounterDialog from '@/components/encounters/edit-encounter-dialog';
import Link from 'next/link';

interface Encounter {
    id: string;
    patientId: string;
    professionalId: string;
    date: string;
    time?: string;
    status: string;
    notes?: string;
    clinicId: string;
    patient: {
        name: string;
    };
    professional: {
        name: string;
    };
    createdAt: string;
    updatedAt: string;
}

export default function AtendimentosPage() {
    const [encounters, setEncounters] = useState<Encounter[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Create dialog
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    // Edit dialog
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingEncounter, setEditingEncounter] = useState<Encounter | null>(null);

    // Delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Loading state for actions
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    const fetchEncounters = async () => {
        try {
            setIsLoading(true);
            setError('');
            const response = await api.get('/encounters');
            setEncounters(response.data);
        } catch (err: any) {
            console.error('Error fetching encounters:', err);
            setError('Erro ao carregar atendimentos');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEncounters();
    }, []);

    // Auto-dismiss success message
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const handleEdit = (encounter: Encounter) => {
        setEditingEncounter(encounter);
        setIsEditDialogOpen(true);
    };

    const handleDeleteClick = (encounterId: string) => {
        setDeletingId(encounterId);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!deletingId) return;

        try {
            setLoadingAction(deletingId);
            await api.delete(`/encounters/${deletingId}`);

            // Remove from list
            setEncounters(prev => prev.filter(e => e.id !== deletingId));

            setShowDeleteConfirm(false);
            setDeletingId(null);
            setSuccessMessage('Atendimento excluído com sucesso!');
        } catch (err: any) {
            console.error('Error deleting encounter:', err);
            setError(err.response?.data?.message || 'Erro ao excluir atendimento');
        } finally {
            setLoadingAction(null);
        }
    };

    const getStatusBadge = (status: string) => {
        if (status === 'OPEN') {
            return (
                <span className="px-2 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    <Clock className="h-3 w-3" />
                    Em Andamento
                </span>
            );
        }
        if (status === 'CLOSED') {
            return (
                <span className="px-2 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    <CheckCircle className="h-3 w-3" />
                    Finalizado
                </span>
            );
        }
        return (
            <span className="px-2 py-1 inline-flex text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                {status}
            </span>
        );
    };

    const formatDateTime = (date: string, time?: string) => {
        const dateObj = new Date(date);
        const dateStr = dateObj.toLocaleDateString('pt-BR');
        return time ? `${dateStr} ${time}` : dateStr;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg text-gray-600">Carregando atendimentos...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg bg-red-50 p-4">
                <p className="text-red-600">{error}</p>
                <Button onClick={fetchEncounters} className="mt-4" variant="outline">
                    Tentar novamente
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Atendimentos</h1>
                    <p className="text-gray-600 mt-1">Gerencie os atendimentos da clínica</p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Atendimento
                </Button>
            </div>

            {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
                    {successMessage}
                </div>
            )}

            {encounters.length === 0 ? (
                <Card className="p-12 text-center">
                    <div className="text-gray-400 mb-4">
                        <FileText className="h-16 w-16 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Nenhum atendimento registrado
                    </h3>
                    <p className="text-gray-600 mb-4">
                        Comece registrando um novo atendimento
                    </p>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Atendimento
                    </Button>
                </Card>
            ) : (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Data/Hora
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Paciente
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Profissional
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Observações
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {encounters.map((encounter) => (
                                    <tr key={encounter.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDateTime(encounter.date, encounter.time)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {encounter.patient.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {encounter.professional.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(encounter.status)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                            {encounter.notes || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex gap-2">
                                                <Link href={`/dashboard/atendimentos/${encounter.id}`}>
                                                    <Button size="sm" variant="default">
                                                        <Eye className="h-3 w-3 mr-1" />
                                                        Ver
                                                    </Button>
                                                </Link>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleEdit(encounter)}
                                                    disabled={loadingAction === encounter.id || encounter.status === 'CLOSED'}
                                                >
                                                    <Edit className="h-3 w-3 mr-1" />
                                                    Editar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleDeleteClick(encounter.id)}
                                                    disabled={loadingAction === encounter.id || encounter.status === 'CLOSED'}
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

            {/* Create Dialog */}
            <CreateEncounterDialog
                open={isCreateDialogOpen}
                onClose={() => setIsCreateDialogOpen(false)}
                onSuccess={() => {
                    setIsCreateDialogOpen(false);
                    fetchEncounters();
                    setSuccessMessage('Atendimento criado com sucesso!');
                }}
            />

            {/* Edit Dialog */}
            <EditEncounterDialog
                open={isEditDialogOpen}
                encounter={editingEncounter}
                onClose={() => {
                    setIsEditDialogOpen(false);
                    setEditingEncounter(null);
                }}
                onSuccess={() => {
                    setIsEditDialogOpen(false);
                    setEditingEncounter(null);
                    fetchEncounters();
                    setSuccessMessage('Atendimento atualizado com sucesso!');
                }}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir Atendimento</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir este atendimento?
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
