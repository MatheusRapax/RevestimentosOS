'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    ArrowLeft,
    User,
    Stethoscope,
    Clock,
    FileText,
    Pill,
    CheckCircle,
    Lock,
    Plus,
    Save,
    ClipboardList,
    Paperclip,
    Download,
    Upload,
    FileDown
} from 'lucide-react';

interface TimelineEvent {
    type: 'start' | 'record' | 'procedure' | 'consumable' | 'close';
    timestamp: string;
    data: any;
}

interface EncounterTimeline {
    encounter: {
        id: string;
        status: 'OPEN' | 'CLOSED';
        date: string;
        notes?: string;
        openedAt: string;
        closedAt?: string;
        patient: { id: string; name: string; email?: string; phone?: string };
        professional: { id: string; name: string; email?: string };
        appointment?: any;
    };
    timeline: TimelineEvent[];
    summary: {
        recordsCount: number;
        proceduresCount: number;
        consumablesCount: number;
    };
}

interface SoapNote {
    id: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
}

interface Attachment {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    createdAt: string;
    uploadedBy: { id: string; name: string };
}

function EncounterDetailContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const encounterId = params.id as string;

    // Check where user came from
    const fromHistory = searchParams.get('from') === 'historico';
    const backUrl = fromHistory ? '/dashboard/atendimentos/historico' : '/dashboard/atendimentos';

    const [data, setData] = useState<EncounterTimeline | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isClosing, setIsClosing] = useState(false);

    // SOAP Note state
    const [note, setNote] = useState<SoapNote | null>(null);
    const [soapForm, setSoapForm] = useState({
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
    });
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [noteSuccess, setNoteSuccess] = useState('');

    // Attachments state
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    // Report state
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    const fetchTimeline = async () => {
        try {
            setIsLoading(true);
            setError('');
            const response = await api.get(`/encounters/${encounterId}/timeline`);
            setData(response.data);
        } catch (err: any) {
            console.error('Error fetching timeline:', err);
            setError(err.response?.data?.message || 'Erro ao carregar atendimento');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchNote = async () => {
        try {
            const response = await api.get(`/encounters/${encounterId}/note`);
            if (response.data) {
                setNote(response.data);
                setSoapForm({
                    subjective: response.data.subjective || '',
                    objective: response.data.objective || '',
                    assessment: response.data.assessment || '',
                    plan: response.data.plan || '',
                });
            }
        } catch (err: any) {
            // 404 is expected if no note exists yet
            if (err.response?.status !== 404) {
                console.error('Error fetching note:', err);
            }
        }
    };

    useEffect(() => {
        if (encounterId) {
            fetchTimeline();
            fetchNote();
            fetchAttachments();
        }
    }, [encounterId]);

    const fetchAttachments = async () => {
        try {
            const response = await api.get(`/encounters/${encounterId}/attachments`);
            setAttachments(response.data);
        } catch (err: any) {
            console.error('Error fetching attachments:', err);
        }
    };

    const handleUploadAttachment = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !data || data.encounter.status === 'CLOSED') return;

        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('file', file);

            await api.post(`/encounters/${encounterId}/attachments`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            fetchAttachments();
        } catch (err: any) {
            console.error('Error uploading attachment:', err);
            setError(err.response?.data?.message || 'Erro ao enviar anexo');
        } finally {
            setIsUploading(false);
            event.target.value = '';
        }
    };

    const handleDownloadAttachment = async (attachment: Attachment) => {
        try {
            const response = await api.get(
                `/encounters/${encounterId}/attachments/${attachment.id}`,
                { responseType: 'blob' }
            );
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', attachment.originalName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err: any) {
            console.error('Error downloading attachment:', err);
            setError('Erro ao baixar anexo');
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleGenerateReport = async () => {
        try {
            setIsGeneratingReport(true);
            const response = await api.get(`/encounters/${encounterId}/report`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `relatorio-atendimento-${encounterId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            console.error('Error generating report:', err);
            setError(err.response?.data?.message || 'Erro ao gerar relatório');
        } finally {
            setIsGeneratingReport(false);
        }
    };

    // Auto-dismiss success message
    useEffect(() => {
        if (noteSuccess) {
            const timer = setTimeout(() => setNoteSuccess(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [noteSuccess]);

    const handleSaveNote = async () => {
        if (!data || data.encounter.status === 'CLOSED') return;

        try {
            setIsSavingNote(true);
            if (note) {
                await api.put(`/encounters/${encounterId}/note`, soapForm);
                setNoteSuccess('Nota atualizada com sucesso!');
            } else {
                const response = await api.post(`/encounters/${encounterId}/note`, soapForm);
                setNote(response.data);
                setNoteSuccess('Nota salva com sucesso!');
            }
        } catch (err: any) {
            console.error('Error saving note:', err);
            setError(err.response?.data?.message || 'Erro ao salvar nota');
        } finally {
            setIsSavingNote(false);
        }
    };

    const handleCloseEncounter = async () => {
        if (!data || data.encounter.status === 'CLOSED') return;

        try {
            setIsClosing(true);
            await api.post(`/encounters/${encounterId}/close`, {});
            fetchTimeline();
        } catch (err: any) {
            console.error('Error closing encounter:', err);
            setError(err.response?.data?.message || 'Erro ao finalizar atendimento');
        } finally {
            setIsClosing(false);
        }
    };

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'start': return <Clock className="h-4 w-4 text-green-600" />;
            case 'record': return <FileText className="h-4 w-4 text-blue-600" />;
            case 'procedure': return <Stethoscope className="h-4 w-4 text-purple-600" />;
            case 'consumable': return <Pill className="h-4 w-4 text-orange-600" />;
            case 'close': return <Lock className="h-4 w-4 text-gray-600" />;
            default: return <Clock className="h-4 w-4" />;
        }
    };

    const getEventLabel = (type: string) => {
        switch (type) {
            case 'start': return 'Atendimento iniciado';
            case 'record': return 'Registro adicionado';
            case 'procedure': return 'Procedimento realizado';
            case 'consumable': return 'Consumível utilizado';
            case 'close': return 'Atendimento finalizado';
            default: return 'Evento';
        }
    };

    const getEventColor = (type: string) => {
        switch (type) {
            case 'start': return 'border-green-200 bg-green-50';
            case 'record': return 'border-blue-200 bg-blue-50';
            case 'procedure': return 'border-purple-200 bg-purple-50';
            case 'consumable': return 'border-orange-200 bg-orange-50';
            case 'close': return 'border-gray-200 bg-gray-50';
            default: return 'border-gray-200 bg-gray-50';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg text-gray-600">Carregando atendimento...</div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="space-y-4">
                <Button variant="outline" size="sm" onClick={() => router.push(backUrl)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                </Button>
                <div className="rounded-lg bg-red-50 p-4">
                    <p className="text-red-600">{error || 'Atendimento não encontrado'}</p>
                </div>
            </div>
        );
    }

    const { encounter, timeline, summary } = data;
    const isOpen = encounter.status === 'OPEN';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => router.push(backUrl)}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Atendimento
                        </h1>
                        <p className="text-gray-600">
                            {formatDate(encounter.date)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {isOpen ? (
                        <span className="px-3 py-1 inline-flex items-center gap-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                            <Clock className="h-4 w-4" />
                            Em Andamento
                        </span>
                    ) : (
                        <span className="px-3 py-1 inline-flex items-center gap-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                            <CheckCircle className="h-4 w-4" />
                            Finalizado
                        </span>
                    )}
                    {!isOpen && (
                        <Button
                            size="sm"
                            onClick={handleGenerateReport}
                            disabled={isGeneratingReport}
                        >
                            <FileDown className="h-4 w-4 mr-2" />
                            {isGeneratingReport ? 'Gerando...' : 'Gerar Relatório'}
                        </Button>
                    )}
                </div>
            </div>

            {/* Patient & Professional Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Paciente</p>
                            <p className="font-semibold text-gray-900">{encounter.patient.name}</p>
                            {encounter.patient.phone && (
                                <p className="text-sm text-gray-500">{encounter.patient.phone}</p>
                            )}
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Stethoscope className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Profissional</p>
                            <p className="font-semibold text-gray-900">{encounter.professional.name}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{summary.recordsCount}</p>
                    <p className="text-sm text-gray-500">Registros</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">{summary.proceduresCount}</p>
                    <p className="text-sm text-gray-500">Procedimentos</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-orange-600">{summary.consumablesCount}</p>
                    <p className="text-sm text-gray-500">Consumíveis</p>
                </Card>
            </div>

            {/* SOAP Clinical Notes */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-teal-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Nota Clínica (SOAP)</h2>
                    </div>
                    {!isOpen && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Somente leitura
                        </span>
                    )}
                </div>

                {noteSuccess && (
                    <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-2 rounded">
                        {noteSuccess}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="subjective" className="text-teal-700 font-medium">
                            S - Subjetivo
                        </Label>
                        <Textarea
                            id="subjective"
                            placeholder="Queixa principal, história da doença atual..."
                            value={soapForm.subjective}
                            onChange={(e) => setSoapForm({ ...soapForm, subjective: e.target.value })}
                            disabled={!isOpen}
                            className="min-h-[120px]"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="objective" className="text-blue-700 font-medium">
                            O - Objetivo
                        </Label>
                        <Textarea
                            id="objective"
                            placeholder="Exame físico, sinais vitais, achados..."
                            value={soapForm.objective}
                            onChange={(e) => setSoapForm({ ...soapForm, objective: e.target.value })}
                            disabled={!isOpen}
                            className="min-h-[120px]"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="assessment" className="text-purple-700 font-medium">
                            A - Avaliação
                        </Label>
                        <Textarea
                            id="assessment"
                            placeholder="Hipóteses diagnósticas, diagnóstico..."
                            value={soapForm.assessment}
                            onChange={(e) => setSoapForm({ ...soapForm, assessment: e.target.value })}
                            disabled={!isOpen}
                            className="min-h-[120px]"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="plan" className="text-orange-700 font-medium">
                            P - Plano
                        </Label>
                        <Textarea
                            id="plan"
                            placeholder="Condutas, prescrições, orientações..."
                            value={soapForm.plan}
                            onChange={(e) => setSoapForm({ ...soapForm, plan: e.target.value })}
                            disabled={!isOpen}
                            className="min-h-[120px]"
                        />
                    </div>
                </div>

                {isOpen && (
                    <div className="mt-4 flex justify-end">
                        <Button onClick={handleSaveNote} disabled={isSavingNote}>
                            <Save className="h-4 w-4 mr-2" />
                            {isSavingNote ? 'Salvando...' : (note ? 'Atualizar Nota' : 'Salvar Nota')}
                        </Button>
                    </div>
                )}
            </Card>

            {/* Actions */}
            {isOpen && (
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">Ações disponíveis</p>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" disabled>
                                <Plus className="h-4 w-4 mr-1" />
                                Procedimento
                            </Button>
                            <Button variant="outline" size="sm" disabled>
                                <Plus className="h-4 w-4 mr-1" />
                                Consumível
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleCloseEncounter}
                                disabled={isClosing}
                            >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {isClosing ? 'Finalizando...' : 'Finalizar Atendimento'}
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Timeline */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>

                {timeline.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>Nenhum evento registrado</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {timeline.map((event, index) => (
                            <div
                                key={index}
                                className={`flex gap-4 p-4 rounded-lg border ${getEventColor(event.type)}`}
                            >
                                <div className="flex-shrink-0 mt-1">
                                    {getEventIcon(event.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="font-medium text-gray-900">
                                            {getEventLabel(event.type)}
                                        </p>
                                        <span className="text-sm text-gray-500">
                                            {formatTime(event.timestamp)}
                                        </span>
                                    </div>
                                    {event.type === 'procedure' && event.data && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            {event.data.name}
                                            {event.data.notes && ` - ${event.data.notes}`}
                                        </p>
                                    )}
                                    {event.type === 'consumable' && event.data && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            {event.data.itemName}
                                            {event.data.quantity > 1 && ` (x${event.data.quantity})`}
                                        </p>
                                    )}
                                    {event.type === 'record' && event.data && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            Tipo: {event.data.type}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* General Notes */}
            {encounter.notes && (
                <Card className="p-4">
                    <h3 className="font-medium text-gray-900 mb-2">Observações</h3>
                    <p className="text-gray-600">{encounter.notes}</p>
                </Card>
            )}

            {/* Attachments */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Paperclip className="h-5 w-5 text-indigo-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Anexos</h2>
                        <span className="text-sm text-gray-500">({attachments.length})</span>
                    </div>
                    {isOpen && (
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleUploadAttachment}
                                disabled={isUploading}
                            />
                            <Button size="sm" disabled={isUploading} asChild>
                                <span>
                                    <Upload className="h-4 w-4 mr-2" />
                                    {isUploading ? 'Enviando...' : 'Anexar Arquivo'}
                                </span>
                            </Button>
                        </label>
                    )}
                    {!isOpen && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Somente leitura
                        </span>
                    )}
                </div>

                {attachments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Paperclip className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>Nenhum anexo</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {attachments.map((attachment) => (
                            <div
                                key={attachment.id}
                                className="py-3 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {attachment.originalName}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {formatFileSize(attachment.size)} • {attachment.uploadedBy.name}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDownloadAttachment(attachment)}
                                >
                                    <Download className="h-4 w-4 mr-1" />
                                    Baixar
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}

// Wrapper with Suspense for useSearchParams
export default function EncounterDetailPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        }>
            <EncounterDetailContent />
        </Suspense>
    );
}
