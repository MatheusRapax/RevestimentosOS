'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Users, Search, FileText, Calendar, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Patient {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    document?: string;
}

interface EncounterSummary {
    id: string;
    patientId: string;
    patient: { id: string; name: string };
    professional: { id: string; name: string };
    status: string;
    startedAt?: string;
    createdAt: string;
    closedAt?: string;
}

export default function HistoricoPage() {
    const router = useRouter();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [encounters, setEncounters] = useState<EncounterSummary[]>([]);
    const [loadingEncounters, setLoadingEncounters] = useState(false);

    // Fetch patients
    useEffect(() => {
        const fetchPatients = async () => {
            try {
                setIsLoading(true);
                const response = await api.get('/patients');
                setPatients(response.data);
            } catch (err) {
                console.error('Error fetching patients:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPatients();
    }, []);

    // Fetch encounters when patient selected
    const handlePatientSelect = async (patient: Patient) => {
        setSelectedPatient(patient);
        setLoadingEncounters(true);
        try {
            const response = await api.get(`/encounters?patientId=${patient.id}`);
            setEncounters(response.data);
        } catch (err) {
            console.error('Error fetching encounters:', err);
            setEncounters([]);
        } finally {
            setLoadingEncounters(false);
        }
    };

    // Filter patients by search
    const filteredPatients = patients.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.document?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Format date - handle invalid dates
    const formatDate = (encounter: EncounterSummary) => {
        const dateStr = encounter.startedAt || encounter.createdAt;
        if (!dateStr) return 'Data não disponível';

        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'Data inválida';

        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Status badge
    const getStatusBadge = (status: string) => {
        const config: Record<string, { color: string; label: string }> = {
            OPEN: { color: 'bg-yellow-100 text-yellow-800', label: 'Em Andamento' },
            CLOSED: { color: 'bg-green-100 text-green-800', label: 'Finalizado' },
        };
        const { color, label } = config[status] || { color: 'bg-gray-100 text-gray-800', label: status };
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{label}</span>;
    };

    // Navigate to encounter with origin tracking
    const handleEncounterClick = (encounterId: string) => {
        router.push(`/dashboard/atendimentos/${encounterId}?from=historico`);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Histórico de Atendimentos</h1>
                <p className="text-gray-500">Selecione um paciente para ver o histórico de atendimentos</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Patients List */}
                <Card className="p-4">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-gray-500" />
                            <h2 className="font-semibold">Pacientes</h2>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Buscar por nome, documento..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* List */}
                        <div className="max-h-[500px] overflow-y-auto space-y-1">
                            {isLoading ? (
                                <div className="text-center py-4 text-gray-500">Carregando...</div>
                            ) : filteredPatients.length === 0 ? (
                                <div className="text-center py-4 text-gray-500">Nenhum paciente encontrado</div>
                            ) : (
                                filteredPatients.map((patient) => (
                                    <div
                                        key={patient.id}
                                        onClick={() => handlePatientSelect(patient)}
                                        className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedPatient?.id === patient.id
                                            ? 'bg-blue-50 border border-blue-200'
                                            : 'hover:bg-gray-50 border border-transparent'
                                            }`}
                                    >
                                        <div className="font-medium text-gray-900">{patient.name}</div>
                                        <div className="text-xs text-gray-500">
                                            {patient.document || patient.email || patient.phone || '-'}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </Card>

                {/* Encounters List */}
                <Card className="lg:col-span-2 p-4">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-gray-500" />
                            <h2 className="font-semibold">
                                {selectedPatient
                                    ? `Atendimentos de ${selectedPatient.name}`
                                    : 'Selecione um paciente'}
                            </h2>
                        </div>

                        {!selectedPatient ? (
                            <div className="text-center py-12 text-gray-400">
                                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>Selecione um paciente na lista para ver o histórico</p>
                            </div>
                        ) : loadingEncounters ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            </div>
                        ) : encounters.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>Nenhum atendimento registrado</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {encounters.map((encounter) => (
                                    <div
                                        key={encounter.id}
                                        onClick={() => handleEncounterClick(encounter.id)}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-gray-400" />
                                                <span className="font-medium">{formatDate(encounter)}</span>
                                                {getStatusBadge(encounter.status)}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                Profissional: {encounter.professional.name}
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-400" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
