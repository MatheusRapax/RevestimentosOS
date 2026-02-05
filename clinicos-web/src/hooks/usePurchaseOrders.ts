import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
// import { useToast } from '@/components/ui/use-toast'; -- Toast missing, handling in component


export function usePurchaseOrders(id?: string) {
    const queryClient = useQueryClient();
    // const { toast } = useToast(); -- Removed

    // Fetch Single PO
    const { data: purchaseOrder, isLoading, error } = useQuery({
        queryKey: ['purchaseOrder', id],
        queryFn: async () => {
            const response = await api.get(`/purchase-orders/${id}`);
            return response.data;
        },
        enabled: !!id,
    });

    // Create Stock Entry from PO (Receive Interface)
    const receiveOrder = useMutation({
        mutationFn: async (poId: string) => {
            const response = await api.post(`/stock/entries/from-po/${poId}`);
            return response.data;
        },
        // Toast handled in component
    });

    return {
        purchaseOrder,
        isLoading,
        error,
        receiveOrder,
    };
}
