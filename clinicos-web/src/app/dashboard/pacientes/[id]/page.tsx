'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    ArrowLeft,
    User,
    Calendar,
    Stethoscope,
    Clock,
    Phone,
    Mail,
    FileText,
    CheckCircle
} from 'lucide-react';
import Link from 'next/link';

interface TimelineItem {
    type: 'appointment' | 'encounter';
    date: string;
    label: string;
    referenceId: string;
    status: string;
    professionalName?: string;
    details?: {
        proceduresCount?: number;
        consumablesCount?: number;
    };
}

interface PatientSummary {
    patient: {
        id: string;
        name: string;
        email?: string;
        phone?: string;
        document?: string;
        birthDate?: string;
    };
    totalAppointments: number;
    totalEncounters: number;
    activeEncounters: number;
    lastVisit: string | null;
}

export default function PatientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const patientId = params.id as string;

    const [summary, setSummary] = useState<PatientSummary | null>(null);
    const [timeline, setTimeline] = useState<TimelineItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (patientId) {
            fetchData();
        }
    }, [patientId]);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            setError('');

            const [summaryRes, timelineRes] = await Promise.all([
                api.get(`/patients/${patientId}/summary`),
                api.get(`/patients/${patientId}/timeline`),
            ]);

            setSummary(summaryRes.data);
            setTimeline(timelineRes.data);
        } catch (err: any) {
            console.error('Error fetching patient data:', err);
            setError(err.response?.data?.message || 'Erro ao carregar dados do paciente');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const calculateAge = (birthDate: string) => {
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const getStatusBadge = (type: string, status: string) => {
        if (type === 'appointment') {
            const variants: Record<string, { bg: string; text: string; label: string }> = {
                SCHEDULED: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Agendado' },
                CONFIRMED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Confirmado' },
                CHECKED_IN: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Check-in' },
                COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Concluído' },
                CANCELLED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelado' },
                NO_SHOW: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Faltou' },
            };
            const v = variants[status] || variants.SCHEDULED;
            return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${v.bg} ${v.text}`}>{v.label}</span>;
        }

        if (status === 'OPEN') {
            return (
                <span className="px-2 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    <Clock className="h-3 w-3" />
                    Em Andamento
                </span>
            );
        }
        return (
            <span className="px-2 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                <CheckCircle className="h-3 w-3" />
                Finalizado
            </span>
        );
    };

    const getTimelineIcon = (type: string) => {
        if (type === 'appointment') {
            return <Calendar className="h-4 w-4 text-blue-600" />;
        }
        return <Stethoscope className="h-4 w-4 text-purple-600" />;
    };

    const handleTimelineClick = (item: TimelineItem) => {
        if (item.type === 'appointment') {
            router.push('/dashboard/agenda');
        } else {
            router.push(`/dashboard/atendimentos/${item.referenceId}`);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg text-gray-600">Carregando prontuário...</div>
            </div>
        );
    }

    if (error || !summary) {
        return (
            <div className="space-y-4">
                <Link href="/dashboard/pacientes">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Button>
                </Link>
                <div className="rounded-lg bg-red-50 p-4">
                    <p className="text-red-600">{error || 'Paciente não encontrado'}</p>
                </div>
            </div>
        );
    }

    const { patient } = summary;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/pacientes">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Prontuário</h1>
                    <p className="text-gray-600">{patient.name}</p>
                </div>
            </div>

            {/* Patient Info Card */}
            <Card className="p-6">
                <div className="flex items-start gap-6">
                    <div className="p-4 bg-blue-100 rounded-full">
                        <User className="h-10 w-10 text-blue-600" />
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">{patient.name}</h2>
                            {patient.document && (
                                <p className="text-gray-600">CPF: {patient.document}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            {patient.birthDate && (
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    {formatDate(patient.birthDate)} ({calculateAge(patient.birthDate)} anos)
                                </p>
                            )}
                            {patient.phone && (
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <Phone className="h-4 w-4" />
                                    {patient.phone}
                                </p>
                            )}
                            {patient.email && (
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    {patient.email}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{summary.totalAppointments}</p>
                    <p className="text-sm text-gray-500">Agendamentos</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">{summary.totalEncounters}</p>
                    <p className="text-sm text-gray-500">Atendimentos</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{summary.activeEncounters}</p>
                    <p className="text-sm text-gray-500">Em Aberto</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-gray-600">
                        {summary.lastVisit ? formatDate(summary.lastVisit) : '-'}
                    </p>
                    <p className="text-sm text-gray-500">Última Visita</p>
                </Card>
            </div>

            {/* Timeline */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Histórico Clínico</h2>

                {timeline.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>Nenhum histórico registrado</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {timeline.map((item, index) => (
                            <div
                                key={`${item.type}-${item.referenceId}`}
                                onClick={() => handleTimelineClick(item)}
                                className={`flex gap-4 p-4 rounded-lg border cursor-pointer transition hover:shadow-md ${item.type === 'appointment'
                                        ? 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                                        : 'border-purple-200 bg-purple-50 hover:bg-purple-100'
                                    }`}
                            >
                                <div className="flex-shrink-0 mt-1">
                                    {getTimelineIcon(item.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <p className="font-medium text-gray-900">{item.label}</p>
                                        {getStatusBadge(item.type, item.status)}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {formatDate(item.date)} às {formatTime(item.date)}
                                    </p>
                                    {item.details && (
                                        <p className="text-sm text-gray-500">
                                            {item.details.proceduresCount} procedimentos, {item.details.consumablesCount} consumíveis
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
