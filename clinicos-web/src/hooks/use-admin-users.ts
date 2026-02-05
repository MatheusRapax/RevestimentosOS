import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface AdminUser {
    id: string;
    name: string | null;
    email: string;
    isActive: boolean;
    isSuperAdmin: boolean;
    createdAt: string;
    clinicUsers?: {
        clinic: {
            id: string;
            name: string;
            slug: string;
        };
        role: {
            key: string;
            name: string;
        };
    }[];
}

export interface UpdateUserData {
    id: string;
    isActive?: boolean;
    isSuperAdmin?: boolean;
    password?: string;
    clinicRoles?: { clinicId: string; roleId: string }[];
    // clinicIds?: string[]; // Deprecated but might be needed for compat if we don't clean up types
}

export function useAdminUsers(search?: string) {
    const queryClient = useQueryClient();

    const users = useQuery({
        queryKey: ['admin-users', search],
        queryFn: async () => {
            const params = search ? { search } : {};
            const response = await api.get<AdminUser[]>('/admin/users', { params });
            return response.data;
        },
    });

    const updateUser = useMutation({
        mutationFn: async (data: UpdateUserData) => {
            const response = await api.patch<AdminUser>(`/admin/users/${data.id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
    });

    const createUser = useMutation({
        mutationFn: async (data: { name: string; email: string; password?: string; isSuperAdmin?: boolean; clinicId?: string; roleId?: string }) => {
            const response = await api.post<AdminUser>('/admin/users', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
    });

    return {
        users: users.data,
        isLoading: users.isLoading,
        updateUser,
        createUser,
    };
}
