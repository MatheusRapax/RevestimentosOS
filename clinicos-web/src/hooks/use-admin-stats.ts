import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface DashboardStats {
    clinics: {
        total: number;
        active: number;
    };
    users: {
        total: number;
        active: number;
        superAdmins: number;
    };
    recentLogs: {
        id: string;
        action: string;
        entity: string;
        message: string;
        createdAt: string;
        user: { name: string | null; email: string };
        clinic: { name: string } | null;
    }[];
}

export function useAdminStats() {
    return useQuery({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            const response = await api.get<DashboardStats>('/admin/stats');
            return response.data;
        },
    });
}
