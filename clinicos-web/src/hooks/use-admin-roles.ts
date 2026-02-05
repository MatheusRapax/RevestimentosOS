
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Permission {
    id: string;
    key: string;
    description: string | null;
}

export interface Role {
    id: string;
    key: string;
    name: string;
    description: string | null;
    rolePermissions: { permission: Permission }[];
    _count?: {
        rolePermissions: number;
        clinicUsers: number;
    };
}

export function useAdminRoles() {
    const queryClient = useQueryClient();

    // Fetch Roles
    const rolesQuery = useQuery({
        queryKey: ['admin-roles'],
        queryFn: async () => {
            const response = await api.get<Role[]>('/admin/roles');
            return response.data;
        }
    });

    // Fetch All Permissions (for editor)
    const permissionsQuery = useQuery({
        queryKey: ['admin-permissions'],
        queryFn: async () => {
            const response = await api.get<Permission[]>('/admin/permissions');
            return response.data;
        }
    });

    // Create Role
    const createRoleMutation = useMutation({
        mutationFn: async (data: { key: string; name: string; description?: string }) => {
            return api.post('/admin/roles', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
        }
    });

    // Update Role
    const updateRoleMutation = useMutation({
        mutationFn: async (params: { id: string; data: { name?: string; description?: string; permissionKeys?: string[] } }) => {
            return api.put(`/admin/roles/${params.id}`, params.data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
        }
    });

    // Delete Role
    const deleteRoleMutation = useMutation({
        mutationFn: async (id: string) => {
            return api.delete(`/admin/roles/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
        }
    });

    return {
        roles: rolesQuery.data || [],
        permissions: permissionsQuery.data || [],
        isLoading: rolesQuery.isLoading || permissionsQuery.isLoading,
        createRole: createRoleMutation.mutateAsync,
        updateRole: updateRoleMutation.mutateAsync,
        deleteRole: deleteRoleMutation.mutateAsync,
    };
}
