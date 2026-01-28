'use client';

import { useState } from 'react';
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

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateEncounterDialog({ open, onClose, onSuccess }: Props) {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await api.post('/encounters', formData);
            onSuccess();
            // Reset form
            setFormData({
                patientId: '',
                professionalId: '',
                date: '',
                time: '',
                status: 'SCHEDULED',
                notes: '',
            });
        } catch (err: any) {
            console.error('Error creating encounter:', err);
            setError(err.response?.data?.message || 'Erro ao criar atendimento');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Novo Atendimento</DialogTitle>
                    <DialogDescription>
                        Preencha os dados para registrar um novo atendimento
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <div>
                        <Label htmlFor="patientId">Paciente *</Label>
                        <Select
                            value={formData.patientId}
                            onValueChange={(value) => setFormData({ ...formData, patientId: value })}
                            disabled={patientsLoading || isLoading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={patientsLoading ? "Carregando..." : "Selecione o paciente"} />
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
                        <Label htmlFor="professionalId">Profissional *</Label>
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
                            <Label htmlFor="date">Data *</Label>
                            <Input
                                id="date"
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="time">Horário *</Label>
                            <Input
                                id="time"
                                type="time"
                                value={formData.time}
                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Status *</Label>
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
                        <Label htmlFor="notes">Observações (opcional)</Label>
                        <Textarea
                            id="notes"
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
                            {isLoading ? 'Criando...' : 'Criar Atendimento'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
