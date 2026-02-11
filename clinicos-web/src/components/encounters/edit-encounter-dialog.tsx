'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePatients } from '@/hooks/usePatients';
import { useProfessionals } from '@/hooks/useProfessionals';

interface Encounter {
    id: string;
    patientId: string;
    professionalId: string;
    date: string;
    time?: string;
    status: string;
    notes?: string;
}

interface Props {
    open: boolean;
    encounter: Encounter | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditEncounterDialog({ open, encounter, onClose, onSuccess }: Props) {
    const [formData, setFormData] = useState({
        patientId: '',
        professionalId: '',
        date: '',
        time: '',
        status: 'SCHEDULED',
        notes: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Fetch patients and professionals
    const { patients, isLoading: patientsLoading, error: patientsError } = usePatients();
    const { professionals, isLoading: professionalsLoading, error: professionalsError } = useProfessionals();

    // Populate form when encounter changes
    useEffect(() => {
        if (encounter) {
            setFormData({
                patientId: encounter.patientId,
                professionalId: encounter.professionalId,
                date: encounter.date,
                time: encounter.time || '',
                status: encounter.status,
                notes: encounter.notes || '',
            });
        }
    }, [encounter]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!encounter) return;

        setError('');
        setIsLoading(true);

        try {
            await api.patch(`/encounters/${encounter.id}`, formData);
            onSuccess();
        } catch (err: any) {
            console.error('Error updating encounter:', err);
            setError(err.response?.data?.message || 'Erro ao atualizar atendimento');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Editar Atendimento</DialogTitle>
                    <DialogDescription>
                        Atualize os dados do atendimento
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <div>
                        <Label htmlFor="edit-patientId">Cliente *</Label>
                        <Select
                            value={formData.patientId}
                            onValueChange={(value) => setFormData({ ...formData, patientId: value })}
                            disabled={patientsLoading || isLoading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={patientsLoading ? "Carregando..." : "Selecione o cliente"} />
                            </SelectTrigger>
                            <SelectContent>
                                {patients.map((patient) => (
                                    <SelectItem key={patient.id} value={patient.id}>
                                        {patient.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {patientsError && (
                            <p className="text-sm text-red-600 mt-1">{patientsError}</p>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="edit-professionalId">Profissional *</Label>
                        <Select
                            value={formData.professionalId}
                            onValueChange={(value) => setFormData({ ...formData, professionalId: value })}
                            disabled={professionalsLoading || isLoading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={professionalsLoading ? "Carregando..." : "Selecione o profissional"} />
                            </SelectTrigger>
                            <SelectContent>
                                {professionals.map((professional) => (
                                    <SelectItem key={professional.id} value={professional.id}>
                                        {professional.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {professionalsError && (
                            <p className="text-sm text-red-600 mt-1">{professionalsError}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-date">Data *</Label>
                            <Input
                                id="edit-date"
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-time">Horário *</Label>
                            <Input
                                id="edit-time"
                                type="time"
                                value={formData.time}
                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-status">Status *</Label>
                        <Select
                            value={formData.status}
                            onValueChange={(value) => setFormData({ ...formData, status: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="SCHEDULED">Agendado</SelectItem>
                                <SelectItem value="COMPLETED">Concluído</SelectItem>
                                <SelectItem value="CANCELLED">Cancelado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-notes">Observações (opcional)</Label>
                        <Textarea
                            id="edit-notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Notas sobre o atendimento"
                            rows={3}
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || patientsLoading || professionalsLoading || !formData.patientId || !formData.professionalId}
                        >
                            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
