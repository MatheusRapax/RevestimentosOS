import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Tenant {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    modules: string[];
    logoUrl?: string;
    createdAt: string;
    _count?: {
        clinicUsers: number;
    }
}

export interface CreateTenantData {
    name: string;
    slug: string;
    modules: string[];
    logoUrl?: string;
    isActive?: boolean;
}

export interface UpdateTenantData {
    id: string;
    name?: string;
    slug?: string;
    modules?: string[];
    isActive?: boolean;
    logoUrl?: string;
}

export function useAdminTenants() {
    const queryClient = useQueryClient();

    const { data: tenants, isLoading, error } = useQuery<Tenant[]>({
        queryKey: ['admin-tenants'],
        queryFn: async () => {
            const response = await api.get('/admin/tenants');
            return response.data;
        },
    });

    const createTenant = useMutation({
        mutationFn: async (data: CreateTenantData) => {
            const response = await api.post('/admin/tenants', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
        },
    });

    const updateTenant = useMutation({
        mutationFn: async (data: UpdateTenantData) => {
            const { id, ...updateData } = data;
            const response = await api.patch(`/admin/tenants/${id}`, updateData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
        },
    });

    return {
        tenants,
        isLoading,
        error,
        createTenant,
        updateTenant,
    };
}
