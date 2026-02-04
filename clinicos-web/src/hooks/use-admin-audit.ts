import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface AuditLog {
    id: string;
    clinicId: string | null;
    userId: string | null;
    action: string;
    entity: string;
    entityId: string | null;
    message: string | null;
    ip: string | null;
    createdAt: string;
    user: { name: string | null; email: string } | null;
    clinic: { name: string; slug: string } | null;
}

interface AuditParams {
    clinicId?: string;
    userId?: string;
    action?: string;
    limit?: number;
    offset?: number;
}

export function useAdminAudit(params?: AuditParams) {
    return useQuery({
        queryKey: ['admin-audit', params],
        queryFn: async () => {
            const response = await api.get<{ data: AuditLog[]; total: number }>('/admin/audit', { params });
            return response.data;
        },
        placeholderData: (previousData) => previousData, // Keep previous data while fetching
    });
}
