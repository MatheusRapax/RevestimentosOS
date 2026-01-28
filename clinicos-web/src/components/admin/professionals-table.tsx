import { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ProfessionalStatusBadge } from './professional-status-badge';
import { ProfessionalActionsMenu } from './professional-actions-menu';
import { WorkingHoursEditor } from './working-hours-editor';
import { useAuth } from '@/hooks/use-auth';
import { Pencil, X, Clock } from 'lucide-react';
import api from '@/lib/api';

interface Professional {
    id: string;
    name: string;
    email: string;
    active: boolean;
    specialtyId?: string;
    specialtyName?: string;
    color?: string;
}

interface Specialty {
    id: string;
    name: string;
}

interface ProfessionalsTableProps {
    professionals: Professional[];
    loading: boolean;
    onActivate: (userId: string) => Promise<void>;
    onDeactivate: (userId: string) => Promise<void>;
    onRefresh: () => void;
}

export function ProfessionalsTable({
    professionals,
    loading,
    onActivate,
    onDeactivate,
    onRefresh,
}: ProfessionalsTableProps) {
    const { user } = useAuth();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [hoursEditing, setHoursEditing] = useState<Professional | null>(null);
    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [editSpecialtyId, setEditSpecialtyId] = useState<string>('');
    const [editColor, setEditColor] = useState<string>('#3B82F6');

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

    const startEdit = (professional: Professional) => {
        setEditingId(professional.id);
        setEditSpecialtyId(professional.specialtyId || '');
        setEditColor(professional.color || '#3B82F6');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditSpecialtyId('');
        setEditColor('#3B82F6');
    };

    const saveEdit = async () => {
        if (!editingId) return;
        try {
            await api.patch(`/professionals/${editingId}`, {
                specialtyId: editSpecialtyId || null,
                color: editColor,
            });
            cancelEdit();
            onRefresh();
        } catch (err) {
            console.error('Erro ao salvar profissional');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Carregando profissionais...</div>
            </div>
        );
    }

    if (professionals.length === 0) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Nenhum profissional encontrado</div>
            </div>
        );
    }

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Cor</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Especialidade</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {professionals.map((professional) => (
                            <TableRow key={professional.id}>
                                <TableCell>
                                    {editingId === professional.id ? (
                                        <input
                                            type="color"
                                            value={editColor}
                                            onChange={(e) => setEditColor(e.target.value)}
                                            className="w-8 h-8 rounded cursor-pointer"
                                        />
                                    ) : (
                                        <div
                                            className="w-6 h-6 rounded-full border"
                                            style={{ backgroundColor: professional.color || '#ccc' }}
                                        />
                                    )}
                                </TableCell>
                                <TableCell className="font-medium">{professional.name}</TableCell>
                                <TableCell>{professional.email}</TableCell>
                                <TableCell>
                                    {editingId === professional.id ? (
                                        <select
                                            value={editSpecialtyId}
                                            onChange={(e) => setEditSpecialtyId(e.target.value)}
                                            className="px-2 py-1 border rounded text-sm"
                                        >
                                            <option value="">Sem especialidade</option>
                                            {specialties.map((s) => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        professional.specialtyName || '-'
                                    )}
                                </TableCell>
                                <TableCell>
                                    <ProfessionalStatusBadge active={professional.active} />
                                </TableCell>
                                <TableCell className="text-right">
                                    {editingId === professional.id ? (
                                        <div className="flex gap-2 justify-end">
                                            <Button size="sm" onClick={saveEdit}>Salvar</Button>
                                            <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-1 justify-end">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setHoursEditing(professional)}
                                                title="Horários de Atendimento"
                                            >
                                                <Clock className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => startEdit(professional)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <ProfessionalActionsMenu
                                                professional={professional}
                                                isSelf={user?.id === professional.id}
                                                onActivate={onActivate}
                                                onDeactivate={onDeactivate}
                                            />
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {hoursEditing && (
                <WorkingHoursEditor
                    professionalId={hoursEditing.id}
                    professionalName={hoursEditing.name}
                    onClose={() => setHoursEditing(null)}
                />
            )}
        </>
    );
}
