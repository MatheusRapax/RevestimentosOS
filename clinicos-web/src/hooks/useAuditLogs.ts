import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface AuditLog {
    id: string;
    clinicId: string;
    userId: string | null;
    action: string;
    entity: string;
    entityId: string | null;
    message: string | null;
    createdAt: string;
    user?: {
        id: string;
        name: string;
        email: string;
    };
}

interface AuditLogsResponse {
    data: AuditLog[];
    count: number;
}

export function useAuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchLogs = async (filters?: { action?: string; entity?: string }) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (filters?.action) params.set('action', filters.action);
            if (filters?.entity) params.set('entity', filters.entity);
            const response = await api.get<AuditLogsResponse>(`/audit-logs?${params}`);
            setLogs(response.data.data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    return { logs, loading, error, refetch: fetchLogs };
}
