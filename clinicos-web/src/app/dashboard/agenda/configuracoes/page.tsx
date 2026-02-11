'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    ArrowLeft,
    Plus,
    Lock,
    Trash2,
    Calendar,
    Clock,
    User,
    Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ScheduleBlock {
    id: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    reason: string | null;
    professionalId: string | null;
    professional?: { id: string; name: string } | null;
    createdAt: string;
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

const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const DEFAULT_WORKING_HOURS: WorkingHours[] = [
    { dayOfWeek: 0, isOpen: false, startTime: null, endTime: null },
    { dayOfWeek: 1, isOpen: true, startTime: '08:00', endTime: '17:00' },
    { dayOfWeek: 2, isOpen: true, startTime: '08:00', endTime: '17:00' },
    { dayOfWeek: 3, isOpen: true, startTime: '08:00', endTime: '17:00' },
    { dayOfWeek: 4, isOpen: true, startTime: '08:00', endTime: '17:00' },
    { dayOfWeek: 5, isOpen: true, startTime: '08:00', endTime: '17:00' },
    { dayOfWeek: 6, isOpen: false, startTime: null, endTime: null },
];

export default function AgendaConfigPage() {
    const router = useRouter();
    const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Create dialog
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [formData, setFormData] = useState({
        date: '',
        blockType: 'full_day', // full_day | time_range
        startTime: '',
        endTime: '',
        scope: 'clinic', // clinic | professional
        professionalId: '',
        reason: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    // Working hours state
    const [workingHours, setWorkingHours] = useState<WorkingHours[]>(DEFAULT_WORKING_HOURS);
    const [isWorkingHoursLoading, setIsWorkingHoursLoading] = useState(false);
    const [workingHoursSaved, setWorkingHoursSaved] = useState(false);
    const [workingHoursError, setWorkingHoursError] = useState('');

    // Fetch data
    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [blocksRes, professionalsRes] = await Promise.all([
                api.get('/appointments/blocks'),
                api.get('/appointments/professionals'),
            ]);
            setBlocks(blocksRes.data);
            setProfessionals(professionalsRes.data);
        } catch (err: any) {
            console.error('Error fetching data:', err);
            setError(err.response?.data?.message || 'Erro ao carregar dados');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        fetchWorkingHours();
    }, []);

    // Fetch working hours
    const fetchWorkingHours = async () => {
        try {
            const res = await api.get('/appointments/working-hours');
            if (res.data && res.data.length > 0) {
                // Merge with defaults to ensure all 7 days exist
                const merged = DEFAULT_WORKING_HOURS.map(defaultDay => {
                    const found = res.data.find((d: WorkingHours) => d.dayOfWeek === defaultDay.dayOfWeek);
                    return found || defaultDay;
                });
                setWorkingHours(merged);
            }
        } catch (err) {
            console.error('Error fetching working hours:', err);
        }
    };

    // Save working hours
    const handleSaveWorkingHours = async () => {
        setIsWorkingHoursLoading(true);
        setWorkingHoursSaved(false);
        setWorkingHoursError('');
        try {
            await api.put('/appointments/working-hours', workingHours);
            setWorkingHoursSaved(true);
            setTimeout(() => setWorkingHoursSaved(false), 3000);
        } catch (err: any) {
            console.error('Error saving working hours:', err);
            setWorkingHoursError(err.response?.data?.message || 'Erro ao salvar horário de funcionamento');
        } finally {
            setIsWorkingHoursLoading(false);
        }
    };

    // Update working hour for a day
    const updateWorkingHour = (dayOfWeek: number, field: keyof WorkingHours, value: any) => {
        setWorkingHours(prev => prev.map(day => {
            if (day.dayOfWeek !== dayOfWeek) return day;
            if (field === 'isOpen' && !value) {
                return { ...day, isOpen: false, startTime: null, endTime: null };
            }
            if (field === 'isOpen' && value) {
                return { ...day, isOpen: true, startTime: '08:00', endTime: '17:00' };
            }
            return { ...day, [field]: value };
        }));
    };

    // Handle create
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError('');
        setIsSubmitting(true);

        try {
            await api.post('/appointments/blocks', {
                date: formData.date,
                startTime: formData.blockType === 'time_range' ? formData.startTime : null,
                endTime: formData.blockType === 'time_range' ? formData.endTime : null,
                professionalId: formData.scope === 'professional' ? formData.professionalId : null,
                reason: formData.reason || null,
            });

            setIsCreateOpen(false);
            setFormData({
                date: '',
                blockType: 'full_day',
                startTime: '',
                endTime: '',
                scope: 'clinic',
                professionalId: '',
                reason: '',
            });
            fetchData();
        } catch (err: any) {
            setSubmitError(err.response?.data?.message || 'Erro ao criar bloqueio');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle delete
    const handleDelete = async (id: string) => {
        if (!confirm('Remover este bloqueio?')) return;

        try {
            await api.delete(`/appointments/blocks/${id}`);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao remover bloqueio');
        }
    };

    // Format date
    const formatDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/dashboard/agenda')}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Configurações da Agenda</h1>
                        <p className="text-gray-500">Gerencie bloqueios de horários e dias</p>
                    </div>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4" />
                    Novo Bloqueio
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
            )}

            {/* Blocks List */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Lock className="h-5 w-5 text-gray-500" />
                    <h2 className="text-lg font-semibold">Bloqueios Ativos</h2>
                </div>

                {blocks.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>Nenhum bloqueio configurado</p>
                        <p className="text-sm mt-1">
                            Crie bloqueios para feriados, férias ou manutenção
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {blocks.map((block) => (
                            <div
                                key={block.id}
                                className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-red-100 rounded-lg">
                                        <Lock className="h-5 w-5 text-red-600" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">
                                                {formatDate(block.date)}
                                            </span>
                                            {block.startTime && block.endTime ? (
                                                <span className="text-sm text-gray-500 flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {block.startTime} - {block.endTime}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-red-500 font-medium">
                                                    Dia inteiro
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            {block.professionalId ? (
                                                <span className="flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    {block.professional?.name || 'Profissional'}
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1">
                                                    <Users className="h-3 w-3" />
                                                    Toda equipe
                                                </span>
                                            )}
                                            {block.reason && (
                                                <span className="text-gray-400">• {block.reason}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(block.id)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Working Hours */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <h2 className="text-lg font-semibold">Horário de Funcionamento</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {workingHoursSaved && (
                            <span className="text-green-600 text-sm">✓ Salvo!</span>
                        )}
                        <Button
                            onClick={handleSaveWorkingHours}
                            disabled={isWorkingHoursLoading}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isWorkingHoursLoading ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </div>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                    Defina o horário padrão de funcionamento da loja. Agendamentos fora deste horário serão bloqueados automaticamente.
                </p>

                {workingHoursError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                        {workingHoursError}
                    </div>
                )}

                <div className="space-y-3">
                    {workingHours.map((day) => (
                        <div
                            key={day.dayOfWeek}
                            className={`flex items-center gap-4 p-3 rounded-lg border ${day.isOpen ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                                }`}
                        >
                            <div className="w-36 font-medium">
                                {DAY_NAMES[day.dayOfWeek]}
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={day.isOpen}
                                    onChange={(e) => updateWorkingHour(day.dayOfWeek, 'isOpen', e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className={day.isOpen ? 'text-green-700' : 'text-gray-500'}>
                                    {day.isOpen ? 'Aberto' : 'Fechado'}
                                </span>
                            </label>

                            {day.isOpen && (
                                <div className="flex items-center gap-2 ml-auto">
                                    <Input
                                        type="time"
                                        value={day.startTime || ''}
                                        onChange={(e) => updateWorkingHour(day.dayOfWeek, 'startTime', e.target.value)}
                                        className="w-28"
                                    />
                                    <span className="text-gray-400">até</span>
                                    <Input
                                        type="time"
                                        value={day.endTime || ''}
                                        onChange={(e) => updateWorkingHour(day.dayOfWeek, 'endTime', e.target.value)}
                                        className="w-28"
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </Card>

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5 text-red-600" />
                            Criar Bloqueio
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleCreate} className="space-y-4">
                        {submitError && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                                {submitError}
                            </div>
                        )}

                        {/* Date */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                Data *
                            </Label>
                            <Input
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>

                        {/* Block Type */}
                        <div className="space-y-2">
                            <Label>Tipo de Bloqueio</Label>
                            <Select
                                value={formData.blockType}
                                onValueChange={(value) => setFormData({ ...formData, blockType: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="full_day">Dia Inteiro</SelectItem>
                                    <SelectItem value="time_range">Horário Específico</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Time Range (conditional) */}
                        {formData.blockType === 'time_range' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Início *</Label>
                                    <Input
                                        type="time"
                                        required
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Término *</Label>
                                    <Input
                                        type="time"
                                        required
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Scope */}
                        <div className="space-y-2">
                            <Label>Aplicar para</Label>
                            <Select
                                value={formData.scope}
                                onValueChange={(value) => setFormData({ ...formData, scope: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="clinic">Toda a Loja</SelectItem>
                                    <SelectItem value="professional">Profissional Específico</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Professional (conditional) */}
                        {formData.scope === 'professional' && (
                            <div className="space-y-2">
                                <Label>Profissional *</Label>
                                <Select
                                    value={formData.professionalId}
                                    onValueChange={(value) => setFormData({ ...formData, professionalId: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {professionals.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Reason */}
                        <div className="space-y-2">
                            <Label>Motivo (opcional)</Label>
                            <Textarea
                                placeholder="Ex: Feriado, Férias, Manutenção..."
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                rows={2}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                {isSubmitting ? 'Criando...' : 'Criar Bloqueio'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
