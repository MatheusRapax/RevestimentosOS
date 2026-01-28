'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
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
import { Calendar, Clock, User, Stethoscope, DoorOpen, FileText } from 'lucide-react';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    defaultProfessionalId?: string;
    defaultDate?: string;
    defaultTime?: string;
}

export default function CreateAppointmentDialog({
    open,
    onOpenChange,
    onSuccess,
    defaultProfessionalId,
    defaultDate,
    defaultTime,
}: Props) {
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

    // Set defaults when dialog opens
    useEffect(() => {
        if (open) {
            setFormData({
                patientId: '',
                professionalId: defaultProfessionalId || '',
                date: defaultDate || new Date().toISOString().split('T')[0],
                startAt: defaultTime || '',
                endAt: defaultTime ? calculateEndTime(defaultTime) : '',
                room: '',
                notes: '',
            });
            setError('');
        }
    }, [open, defaultProfessionalId, defaultDate, defaultTime]);

    // Calculate end time (30 min after start)
    const calculateEndTime = (startTime: string) => {
        const [hours, minutes] = startTime.split(':').map(Number);
        const endMinutes = minutes + 30;
        const endHours = hours + Math.floor(endMinutes / 60);
        return `${endHours.toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
    };

    const handleClose = () => {
        onOpenChange(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const startDate = new Date(`${formData.date}T${formData.startAt}:00`);
            const endDate = new Date(`${formData.date}T${formData.endAt}:00`);

            await api.post('/appointments', {
                patientId: formData.patientId,
                professionalId: formData.professionalId,
                startAt: startDate.toISOString(),
                endAt: endDate.toISOString(),
                room: formData.room || undefined,
                notes: formData.notes || undefined,
            });

            onSuccess();
        } catch (err: any) {
            console.error('Error creating appointment:', err);
            setError(err.response?.data?.message || 'Erro ao criar agendamento');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader className="border-b pb-4">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        Novo Agendamento
                    </DialogTitle>
                    <DialogDescription>
                        Preencha os dados para criar um novo agendamento
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Patient Select */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                            <User className="h-4 w-4 text-gray-500" />
                            Paciente <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={formData.patientId}
                            onValueChange={(value) => setFormData({ ...formData, patientId: value })}
                            disabled={patientsLoading || isLoading}
                        >
                            <SelectTrigger className="h-11">
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
                            <p className="text-sm text-red-600">{patientsError}</p>
                        )}
                    </div>

                    {/* Professional Select */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium">
                            <Stethoscope className="h-4 w-4 text-gray-500" />
                            Profissional <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={formData.professionalId}
                            onValueChange={(value) => setFormData({ ...formData, professionalId: value })}
                            disabled={professionalsLoading || isLoading}
                        >
                            <SelectTrigger className="h-11">
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
                            <p className="text-sm text-red-600">{professionalsError}</p>
                        )}
                    </div>

                    {/* Date & Time Row */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm font-medium">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                Data <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="h-11"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm font-medium">
                                <Clock className="h-4 w-4 text-gray-500" />
                                Início <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="time"
                                value={formData.startAt}
                                onChange={(e) => {
                                    const start = e.target.value;
                                    setFormData({
                                        ...formData,
                                        startAt: start,
                                        endAt: start ? calculateEndTime(start) : formData.endAt,
                                    });
                                }}
                                className="h-11"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-sm font-medium">
                                <Clock className="h-4 w-4 text-gray-500" />
                                Fim <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="time"
                                value={formData.endAt}
                                onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                                className="h-11"
                                required
                            />
                        </div>
                    </div>

                    {/* Room */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                            <DoorOpen className="h-4 w-4 text-gray-400" />
                            Sala <span className="text-gray-400 font-normal">(opcional)</span>
                        </Label>
                        <Input
                            value={formData.room}
                            onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                            placeholder="Ex: Sala 1, Consultório 2"
                            className="h-11"
                        />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                            <FileText className="h-4 w-4 text-gray-400" />
                            Observações <span className="text-gray-400 font-normal">(opcional)</span>
                        </Label>
                        <Input
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Observações sobre o agendamento"
                            className="h-11"
                        />
                    </div>

                    <DialogFooter className="border-t pt-4 gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isLoading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || patientsLoading || professionalsLoading || !formData.patientId || !formData.professionalId}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isLoading ? 'Criando...' : 'Criar Agendamento'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
