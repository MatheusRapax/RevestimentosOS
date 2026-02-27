import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export interface Promotion {
    id: string;
    name: string;
    description?: string;
    discountPercent: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
    products?: any[];
}

export function usePromotions() {
    const queryClient = useQueryClient();

    const { data: promotions, isLoading } = useQuery({
        queryKey: ['promotions'],
        queryFn: async () => {
            const { data } = await api.get('/promotions');
            return data as Promotion[];
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data: Partial<Promotion> & { productIds: string[] }) => {
            const response = await api.post('/promotions', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Promotion> & { productIds?: string[] } }) => {
            const response = await api.patch(`/promotions/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] });
        },
    });

    const toggleStatusMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const response = await api.patch(`/promotions/${id}`, { isActive });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await api.delete(`/promotions/${id}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] });
        },
    });

    return {
        promotions,
        isLoading,
        createPromotion: createMutation.mutateAsync,
        updatePromotion: updateMutation.mutateAsync,
        togglePromotionStatus: toggleStatusMutation.mutateAsync,
        deletePromotion: deleteMutation.mutateAsync,
    };
}
