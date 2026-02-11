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
import { usePatients } from '@/hooks/usePatients';
import { useProfessionals } from '@/hooks/useProfessionals';

interface Appointment {
    id: string;
    patientId: string;
    professionalId: string;
    startAt: string;
    endAt: string;
    status: string;
    room?: string;
    notes?: string;
    patient: { name: string };
    professional: { name: string };
}

interface Props {
    open: boolean;
    appointment: Appointment | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditAppointmentDialog({ open, appointment, onClose, onSuccess }: Props) {
    const [formData, setFormData] = useState({
        patientId: '',
        professionalId: '',
        date: '',
        startAt: '',
        endAt: '',
        room: '',
        notes: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Fetch patients and professionals
    const { patients, isLoading: patientsLoading, error: patientsError } = usePatients();
    const { professionals, isLoading: professionalsLoading, error: professionalsError } = useProfessionals();

    // Populate form when appointment changes
    useEffect(() => {
        if (appointment) {
            // Parse DateTime strings to date and time
            const startDate = new Date(appointment.startAt);
            const endDate = new Date(appointment.endAt);

            const date = startDate.toISOString().split('T')[0];
            const startTime = startDate.toISOString().split('T')[1].substring(0, 5);
            const endTime = endDate.toISOString().split('T')[1].substring(0, 5);

            setFormData({
                patientId: appointment.patientId,
                professionalId: appointment.professionalId,
                date,
                startAt: startTime,
                endAt: endTime,
                room: appointment.room || '',
                notes: appointment.notes || '',
            });
        }
    }, [appointment]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!appointment) return;

        setError('');
        setIsLoading(true);

        try {
            // Combine date + time into ISO DateTime strings (local timezone)
            const startDate = new Date(`${formData.date}T${formData.startAt}:00`);
            const endDate = new Date(`${formData.date}T${formData.endAt}:00`);

            const startAtISO = startDate.toISOString();
            const endAtISO = endDate.toISOString();

            await api.patch(`/appointments/${appointment.id}`, {
                patientId: formData.patientId,
                professionalId: formData.professionalId,
                startAt: startAtISO,
                endAt: endAtISO,
                room: formData.room,
                notes: formData.notes,
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error updating appointment:', err);
            setError(err.response?.data?.message || 'Erro ao atualizar agendamento');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Editar Agendamento</DialogTitle>
                    <DialogDescription>
                        Atualize os dados do agendamento
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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-startAt">Horário Início *</Label>
                            <Input
                                id="edit-startAt"
                                type="time"
                                value={formData.startAt}
                                onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-endAt">Horário Fim *</Label>
                            <Input
                                id="edit-endAt"
                                type="time"
                                value={formData.endAt}
                                onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-room">Sala (opcional)</Label>
                        <Input
                            id="edit-room"
                            value={formData.room}
                            onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                            placeholder="Ex: Sala 1"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-notes">Observações (opcional)</Label>
                        <Input
                            id="edit-notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Observações sobre o agendamento"
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
