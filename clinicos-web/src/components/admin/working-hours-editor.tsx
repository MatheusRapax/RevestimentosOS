'use client';

import { useState, useEffect } from 'react';
import { Clock, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';

interface WorkingDay {
    dayOfWeek: number;
    isOpen: boolean;
    startTime: string | null;
    endTime: string | null;
}

interface WorkingHoursEditorProps {
    professionalId: string;
    professionalName: string;
    onClose: () => void;
}

const DAYS = [
    { value: 0, label: 'Domingo', short: 'Dom' },
    { value: 1, label: 'Segunda', short: 'Seg' },
    { value: 2, label: 'Terça', short: 'Ter' },
    { value: 3, label: 'Quarta', short: 'Qua' },
    { value: 4, label: 'Quinta', short: 'Qui' },
    { value: 5, label: 'Sexta', short: 'Sex' },
    { value: 6, label: 'Sábado', short: 'Sáb' },
];

export function WorkingHoursEditor({
    professionalId,
    professionalName,
    onClose,
}: WorkingHoursEditorProps) {
    const [hours, setHours] = useState<WorkingDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetchHours();
    }, [professionalId]);

    const fetchHours = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/professionals/${professionalId}/working-hours`);
            setHours(response.data);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao carregar horários');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleDay = (dayOfWeek: number) => {
        setHours(prev =>
            prev.map(day =>
                day.dayOfWeek === dayOfWeek
                    ? { ...day, isOpen: !day.isOpen }
                    : day
            )
        );
    };

    const handleTimeChange = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
        setHours(prev =>
            prev.map(day =>
                day.dayOfWeek === dayOfWeek
                    ? { ...day, [field]: value }
                    : day
            )
        );
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            await api.put(`/professionals/${professionalId}/working-hours`, hours);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao salvar horários');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Horários de Atendimento
                        </h2>
                        <p className="text-sm text-gray-500">{professionalName}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert className="mb-4 bg-green-50 border-green-200">
                        <AlertDescription className="text-green-700">
                            Horários salvos com sucesso!
                        </AlertDescription>
                    </Alert>
                )}

                {loading ? (
                    <div className="text-center py-8 text-gray-500">Carregando...</div>
                ) : (
                    <div className="space-y-3">
                        {hours.map(day => {
                            const dayInfo = DAYS.find(d => d.value === day.dayOfWeek);
                            return (
                                <div
                                    key={day.dayOfWeek}
                                    className={`p-3 rounded-lg border ${day.isOpen ? 'bg-white' : 'bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={day.isOpen}
                                                onChange={() => handleToggleDay(day.dayOfWeek)}
                                                className="w-4 h-4"
                                            />
                                            <span className="font-medium w-20">
                                                {dayInfo?.label}
                                            </span>
                                        </label>

                                        {day.isOpen && (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="time"
                                                    value={day.startTime || '08:00'}
                                                    onChange={(e) =>
                                                        handleTimeChange(day.dayOfWeek, 'startTime', e.target.value)
                                                    }
                                                    className="px-2 py-1 border rounded text-sm"
                                                />
                                                <span className="text-gray-400">às</span>
                                                <input
                                                    type="time"
                                                    value={day.endTime || '18:00'}
                                                    onChange={(e) =>
                                                        handleTimeChange(day.dayOfWeek, 'endTime', e.target.value)
                                                    }
                                                    className="px-2 py-1 border rounded text-sm"
                                                />
                                            </div>
                                        )}

                                        {!day.isOpen && (
                                            <span className="text-sm text-gray-400">Fechado</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="flex gap-2 mt-6">
                    <Button onClick={handleSave} disabled={saving || loading} className="flex-1">
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? 'Salvando...' : 'Salvar'}
                    </Button>
                    <Button variant="outline" onClick={onClose}>
                        Fechar
                    </Button>
                </div>
            </div>
        </div>
    );
}
