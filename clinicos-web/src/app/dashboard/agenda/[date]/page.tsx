'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    ChevronLeft,
    ChevronRight,
    Lock,
    ArrowLeft,
    Plus,
    User,
    Clock,
    Play,
    UserCheck,
    X,
    DoorOpen,
} from 'lucide-react';
import CreateAppointmentDialog from '@/components/agenda/create-appointment-dialog';

interface Appointment {
    id: string;
    patientId: string;
    professionalId: string;
    startAt: string;
    endAt: string;
    status: string;
    room?: string;
    notes?: string;
    patient: { id: string; name: string };
    professional: { id: string; name: string };
    hasActiveEncounter?: boolean;
}

interface ScheduleBlock {
    id: string;
    professionalId: string | null;
    date: string;
    startTime: string | null;
    endTime: string | null;
    reason: string | null;
}

interface Professional {
    id: string;
    name: string;
}

interface WorkingHours {
    dayOfWeek: number;
    isOpen: boolean;
    startTime: string | null;
    endTime: string | null;
}

// Generate time slots from 07:00 to 20:00 (30 min intervals)
const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let hour = 7; hour <= 20; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        if (hour < 20) {
            slots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
    }
    return slots;
};

const TIME_SLOTS = generateTimeSlots();

// Status colors and labels
const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
    SCHEDULED: { color: 'bg-blue-100 border-blue-400 text-blue-800', label: 'Agendado' },
    CONFIRMED: { color: 'bg-blue-200 border-blue-500 text-blue-900', label: 'Confirmado' },
    CHECKED_IN: { color: 'bg-green-100 border-green-400 text-green-800', label: 'Check-in' },
    IN_PROGRESS: { color: 'bg-purple-100 border-purple-400 text-purple-800', label: 'Em Atendimento' },
    COMPLETED: { color: 'bg-gray-100 border-gray-400 text-gray-600', label: 'Finalizado' },
    CANCELLED: { color: 'bg-red-50 border-red-300 text-red-400 line-through', label: 'Cancelado' },
    NO_SHOW: { color: 'bg-orange-50 border-orange-300 text-orange-500', label: 'Não Compareceu' },
};

export default function DayAgendaPage() {
    const params = useParams();
    const router = useRouter();
    const dateParam = params.date as string;

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [workingHours, setWorkingHours] = useState<WorkingHours | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [createSlotInfo, setCreateSlotInfo] = useState<{
        professionalId: string;
        time: string;
    } | null>(null);

    // Selected appointment for detail modal
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showConfirmCancel, setShowConfirmCancel] = useState(false);

    // Parse date
    const currentDate = new Date(dateParam + 'T12:00:00');

    // Fetch data
    const fetchData = async () => {
        try {
            setIsLoading(true);
            setError('');

            const [appointmentsRes, blocksRes, professionalsRes, workingHoursRes] = await Promise.all([
                api.get('/appointments', { params: { startDate: dateParam, endDate: dateParam } }),
                api.get('/appointments/blocks', { params: { startDate: dateParam, endDate: dateParam } }),
                api.get('/appointments/professionals'),
                api.get('/appointments/working-hours'),
            ]);

            setAppointments(appointmentsRes.data);
            setBlocks(blocksRes.data);
            setProfessionals(professionalsRes.data);

            // Get working hours for this day of week
            const dayOfWeek = currentDate.getDay();
            const todayWorkingHours = workingHoursRes.data.find((wh: WorkingHours) => wh.dayOfWeek === dayOfWeek);
            setWorkingHours(todayWorkingHours || null);
        } catch (err: any) {
            console.error('Error fetching data:', err);
            setError(err.response?.data?.message || 'Erro ao carregar dados');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (dateParam) {
            fetchData();
        }
    }, [dateParam]);

    // Navigate date
    const goToDate = (days: number) => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + days);
        const dateStr = `${newDate.getFullYear()}-${(newDate.getMonth() + 1).toString().padStart(2, '0')}-${newDate.getDate().toString().padStart(2, '0')}`;
        router.push(`/dashboard/agenda/${dateStr}`);
    };

    // Format date for display
    const formatDateDisplay = () => {
        return currentDate.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    // Get appointment for a specific slot
    const getAppointmentForSlot = (professionalId: string, time: string) => {
        const [slotHour, slotMin] = time.split(':').map(Number);
        const slotStart = slotHour * 60 + slotMin;
        const slotEnd = slotStart + 30;

        return appointments.find((apt) => {
            if (apt.professionalId !== professionalId) return false;

            const aptStart = new Date(apt.startAt);
            const aptStartMinutes = aptStart.getHours() * 60 + aptStart.getMinutes();

            return aptStartMinutes >= slotStart && aptStartMinutes < slotEnd;
        });
    };

    // Get block for a specific slot - returns block info with reason
    const getSlotBlock = (professionalId: string, time: string): { blocked: boolean; reason?: string } => {
        // First check explicit blocks
        const block = blocks.find((b) => {
            if (b.professionalId === null) {
                if (!b.startTime || !b.endTime) return true;
                return time >= b.startTime && time < b.endTime;
            }
            if (b.professionalId === professionalId) {
                if (!b.startTime || !b.endTime) return true;
                return time >= b.startTime && time < b.endTime;
            }
            return false;
        });

        if (block) {
            return { blocked: true, reason: block.reason || 'Horário bloqueado' };
        }

        // Then check working hours
        if (workingHours) {
            // Day is closed
            if (!workingHours.isOpen) {
                return { blocked: true, reason: 'Clínica fechada neste dia' };
            }

            // Check if time is within working hours
            if (workingHours.startTime && workingHours.endTime) {
                if (time < workingHours.startTime || time >= workingHours.endTime) {
                    return {
                        blocked: true,
                        reason: `Fora do expediente (${workingHours.startTime} - ${workingHours.endTime})`
                    };
                }
            }
        }

        return { blocked: false };
    };

    // Handle slot click
    const handleSlotClick = (professionalId: string, time: string) => {
        if (getSlotBlock(professionalId, time).blocked) return;
        if (getAppointmentForSlot(professionalId, time)) return;

        setCreateSlotInfo({ professionalId, time });
        setIsCreateDialogOpen(true);
    };

    // Actions
    const handleCheckIn = async () => {
        if (!selectedAppointment) return;
        setActionLoading('checkin');
        try {
            await api.post(`/appointments/${selectedAppointment.id}/checkin`);
            await fetchData();
            setSelectedAppointment(null);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Erro ao fazer check-in');
        } finally {
            setActionLoading(null);
        }
    };

    const handleStartEncounter = async () => {
        if (!selectedAppointment) return;
        setActionLoading('start');
        try {
            const res = await api.post(`/appointments/${selectedAppointment.id}/start-encounter`);
            router.push(`/dashboard/atendimentos/${res.data.id}`);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Erro ao iniciar atendimento');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCancel = () => {
        if (!selectedAppointment) return;
        setShowConfirmCancel(true);
    };

    const confirmCancelAppointment = async () => {
        if (!selectedAppointment) return;
        setShowConfirmCancel(false);
        setActionLoading('cancel');
        try {
            await api.delete(`/appointments/${selectedAppointment.id}`);
            await fetchData();
            setSelectedAppointment(null);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Erro ao cancelar');
        } finally {
            setActionLoading(null);
        }
    };

    // Format time
    const formatTime = (isoDate: string) => {
        return new Date(isoDate).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (isLoading && appointments.length === 0) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/dashboard/agenda')}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar ao mês
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Agenda do Dia</h1>
                        <div className="flex items-center gap-2">
                            <p className="text-gray-500 capitalize">{formatDateDisplay()}</p>
                            {workingHours && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${workingHours.isOpen
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                    }`}>
                                    {workingHours.isOpen
                                        ? `${workingHours.startTime} - ${workingHours.endTime}`
                                        : 'Fechado'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => goToDate(-1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const today = new Date();
                            const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
                            router.push(`/dashboard/agenda/${todayStr}`);
                        }}
                    >
                        Hoje
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => goToDate(1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => {
                            setCreateSlotInfo(null);
                            setIsCreateDialogOpen(true);
                        }}
                        className="gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        Novo
                    </Button>
                </div>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg">{error}</div>}

            {/* Calendar Grid */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="w-16 px-2 py-3 text-left text-xs font-medium text-gray-500 border-b border-r sticky left-0 bg-gray-50 z-10">
                                    Hora
                                </th>
                                {professionals.map((prof) => (
                                    <th
                                        key={prof.id}
                                        className="min-w-[200px] px-3 py-3 text-left text-sm font-medium text-gray-900 border-b border-r last:border-r-0"
                                    >
                                        {prof.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {TIME_SLOTS.map((time, timeIndex) => (
                                <tr key={time} className={timeIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                                    <td className="px-2 py-1 text-xs text-gray-500 border-r font-mono sticky left-0 bg-inherit z-10">
                                        {time}
                                    </td>
                                    {professionals.map((prof) => {
                                        const apt = getAppointmentForSlot(prof.id, time);
                                        const blockInfo = getSlotBlock(prof.id, time);
                                        const statusConfig = apt
                                            ? STATUS_CONFIG[apt.status] || STATUS_CONFIG.SCHEDULED
                                            : null;

                                        return (
                                            <td
                                                key={`${prof.id}-${time}`}
                                                title={blockInfo.blocked ? (blockInfo.reason || 'Horário bloqueado') : undefined}
                                                className={`h-14 px-1 py-1 border-r last:border-r-0 relative ${blockInfo.blocked
                                                    ? 'bg-gray-200 cursor-not-allowed'
                                                    : apt
                                                        ? ''
                                                        : 'hover:bg-blue-50 cursor-pointer'
                                                    }`}
                                                onClick={() =>
                                                    !apt && !blockInfo.blocked && handleSlotClick(prof.id, time)
                                                }
                                            >
                                                {blockInfo.blocked && !apt && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Lock className="h-4 w-4 text-gray-400" />
                                                    </div>
                                                )}
                                                {apt && statusConfig && (
                                                    <div
                                                        className={`rounded-lg px-3 py-2 text-sm border-l-4 cursor-pointer shadow-sm hover:shadow-md transition-shadow ${statusConfig.color}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedAppointment(apt);
                                                        }}
                                                    >
                                                        <div className="font-semibold truncate">
                                                            {apt.patient.name}
                                                        </div>
                                                        <div className="text-xs opacity-80 flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {formatTime(apt.startAt)} - {formatTime(apt.endAt)}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs">
                {Object.entries(STATUS_CONFIG).slice(0, 5).map(([key, { color, label }]) => (
                    <div key={key} className="flex items-center gap-1">
                        <div className={`w-3 h-3 rounded border-l-2 ${color}`}></div>
                        <span>{label}</span>
                    </div>
                ))}
            </div>

            {/* Appointment Detail Modal */}
            <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-blue-600" />
                            Detalhes do Agendamento
                        </DialogTitle>
                    </DialogHeader>

                    {selectedAppointment && (
                        <div className="space-y-4">
                            {/* Status Badge */}
                            <div
                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[selectedAppointment.status]?.color || ''
                                    }`}
                            >
                                {STATUS_CONFIG[selectedAppointment.status]?.label}
                            </div>

                            {/* Info */}
                            <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center gap-3">
                                    <User className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-500">Paciente</p>
                                        <p className="font-medium">{selectedAppointment.patient.name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Clock className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-500">Horário</p>
                                        <p className="font-medium">
                                            {formatTime(selectedAppointment.startAt)} -{' '}
                                            {formatTime(selectedAppointment.endAt)}
                                        </p>
                                    </div>
                                </div>
                                {selectedAppointment.room && (
                                    <div className="flex items-center gap-3">
                                        <DoorOpen className="h-5 w-5 text-gray-400" />
                                        <div>
                                            <p className="text-sm text-gray-500">Sala</p>
                                            <p className="font-medium">{selectedAppointment.room}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <DialogFooter className="flex-col sm:flex-row gap-2">
                                {selectedAppointment.status === 'SCHEDULED' && (
                                    <>
                                        <Button
                                            variant="outline"
                                            className="gap-2"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                console.log('Cancel button clicked!');
                                                handleCancel();
                                            }}
                                            disabled={!!actionLoading}
                                        >
                                            <X className="h-4 w-4" />
                                            {actionLoading === 'cancel' ? 'Cancelando...' : 'Cancelar'}
                                        </Button>
                                        <Button
                                            className="gap-2 bg-green-600 hover:bg-green-700"
                                            onClick={handleCheckIn}
                                            disabled={!!actionLoading}
                                        >
                                            <UserCheck className="h-4 w-4" />
                                            {actionLoading === 'checkin' ? 'Fazendo...' : 'Check-in'}
                                        </Button>
                                    </>
                                )}
                                {selectedAppointment.status === 'CHECKED_IN' && (
                                    <Button
                                        className="gap-2 bg-purple-600 hover:bg-purple-700"
                                        onClick={handleStartEncounter}
                                        disabled={!!actionLoading}
                                    >
                                        <Play className="h-4 w-4" />
                                        {actionLoading === 'start' ? 'Iniciando...' : 'Iniciar Atendimento'}
                                    </Button>
                                )}
                                {selectedAppointment.status === 'IN_PROGRESS' && (
                                    <Button
                                        className="gap-2"
                                        onClick={() =>
                                            router.push(`/dashboard/atendimentos/${selectedAppointment.id}`)
                                        }
                                    >
                                        <Play className="h-4 w-4" />
                                        Ir para Atendimento
                                    </Button>
                                )}
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create Dialog */}
            <CreateAppointmentDialog
                open={isCreateDialogOpen}
                onOpenChange={(open) => {
                    setIsCreateDialogOpen(open);
                    if (!open) setCreateSlotInfo(null);
                }}
                onSuccess={() => {
                    setIsCreateDialogOpen(false);
                    setCreateSlotInfo(null);
                    fetchData();
                }}
                defaultProfessionalId={createSlotInfo?.professionalId}
                defaultDate={dateParam}
                defaultTime={createSlotInfo?.time}
            />

            {/* Confirm Cancel Modal */}
            <Dialog open={showConfirmCancel} onOpenChange={setShowConfirmCancel}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Confirmar Cancelamento</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p>Tem certeza que deseja cancelar este agendamento?</p>
                        <p className="text-sm text-gray-500 mt-2">
                            Paciente: <strong>{selectedAppointment?.patient.name}</strong>
                        </p>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowConfirmCancel(false)}>
                            Não, voltar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmCancelAppointment}
                            disabled={actionLoading === 'cancel'}
                        >
                            {actionLoading === 'cancel' ? 'Cancelando...' : 'Sim, cancelar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
