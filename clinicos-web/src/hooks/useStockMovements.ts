import { useState } from 'react';
import api from '@/lib/api';

export interface StockMovement {
    id: string;
    productId: string;
    product: {
        name: string;
        unit?: string;
    };
    lotId?: string;
    lot?: {
        lotNumber: string;
    };
    type: 'IN' | 'OUT' | 'ADJUST';
    quantity: number;
    reason?: string;
    createdAt: string;
    invoiceNumber?: string;
    supplier?: string;
    destinationType?: string;
    destinationName?: string;
    encounterId?: string;
}

interface FetchMovementsParams {
    page?: number;
    limit?: number;
    productId?: string;
    type?: string;
    startDate?: Date;
    endDate?: Date;
}

interface AdjustStockData {
    productId: string;
    lotId?: string;
    quantity: number;
    reason: string;
}

interface AddStockData {
    productId: string;
    lotNumber: string;
    quantity: number;
    expirationDate: string;
    invoiceNumber?: string;
    supplier?: string;
}

interface RemoveStockData {
    productId: string;
    quantity: number;
    reason?: string;
    destinationType?: string;
    destinationName?: string;
    encounterId?: string;
}

export function useStockMovements() {
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [meta, setMeta] = useState({
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
    });

    const fetchMovements = async (params: FetchMovementsParams = {}) => {
        try {
            setIsLoading(true);
            setError(null);

            const queryParams = new URLSearchParams();
            if (params.page) queryParams.set('page', params.page.toString());
            if (params.limit) queryParams.set('limit', params.limit.toString());
            if (params.productId) queryParams.set('productId', params.productId);
            if (params.type && params.type !== 'all') queryParams.set('type', params.type);
            if (params.startDate) queryParams.set('startDate', params.startDate.toISOString());
            if (params.endDate) queryParams.set('endDate', params.endDate.toISOString());

            const response = await api.get(`/stock/movements?${queryParams.toString()}`);
            setMovements(response.data.data);
            setMeta(response.data.meta);
        } catch (err: any) {
            console.error('Error fetching movements:', err);
            setError('Erro ao carregar movimentações');
            setMovements([]);
        } finally {
            setIsLoading(false);
        }
    };

    const adjustStock = async (data: AdjustStockData) => {
        try {
            setIsLoading(true);
            await api.post('/stock/adjust', data);
            await fetchMovements(); // Refresh list
            return { success: true };
        } catch (err: any) {
            console.error('Error adjusting stock:', err);
            const message = err.response?.data?.message || 'Erro ao ajustar estoque';
            setError(message);
            throw new Error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const addStock = async (data: AddStockData) => {
        try {
            setIsLoading(true);
            await api.post('/stock/in', data);
            await fetchMovements();
            return { success: true };
        } catch (err: any) {
            console.error('Error adding stock:', err);
            const message = err.response?.data?.message || 'Erro ao adicionar entrada';
            setError(message);
            throw new Error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const removeStock = async (data: RemoveStockData) => {
        try {
            setIsLoading(true);
            await api.post('/stock/out', data);
            await fetchMovements();
            return { success: true };
        } catch (err: any) {
            console.error('Error removing stock:', err);
            const message = err.response?.data?.message || 'Erro ao registrar saída';
            setError(message);
            throw new Error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        movements,
        meta,
        isLoading,
        error,
        fetchMovements,
        adjustStock,
        addStock,
        removeStock,
    };
}
