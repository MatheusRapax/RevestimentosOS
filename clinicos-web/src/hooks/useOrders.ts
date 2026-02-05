import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export function useOrders(id?: string) {
    const queryClient = useQueryClient();

    // Fetch Single Order
    const { data: order, isLoading, error } = useQuery({
        queryKey: ['order', id],
        queryFn: async () => {
            const response = await api.get(`/orders/${id}`);
            return response.data;
        },
        enabled: !!id,
    });

    // Create Stock Exit from Order (Fulfillment Interface)
    const createExit = useMutation({
        mutationFn: async (orderId: string) => {
            // Updated endpoint ensuring compatibility with Phase 6 implementation
            const response = await api.post(`/stock/exits/from-order/${orderId}`);
            return response.data;
        },
        onSuccess: () => {
            // Success handling in component
        },
    });

    return {
        order,
        isLoading,
        error,
        createExit,
    };
}
