import { useState } from 'react';
import api from '@/lib/api';

export interface StockExitItem {
    id: string;
    productId: string;
    product: {
        name: string;
        unit?: string;
    };
    quantity: number;
    lotId?: string;
}

export interface StockExit {
    id: string;
    status: 'DRAFT' | 'APPROVED' | 'REJECTED' | 'CONFIRMED';
    type: 'SECTOR_REQUEST' | 'PATIENT_USE' | 'DISCARD' | 'EXPIRY' | 'ADJUSTMENT';
    destinationType?: string;
    destinationName?: string;
    notes?: string;
    createdAt: string;
    items?: StockExitItem[];
}

export interface CreateExitData {
    type?: string;
    destinationType?: string;
    destinationName?: string;
    notes?: string;
}

export interface AddExitItemData {
    productId: string;
    quantity: number;
    lotId?: string;
}

export function useStockExits() {
    const [exits, setExits] = useState<StockExit[]>([]);
    const [currentExit, setCurrentExit] = useState<StockExit | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

    const fetchExits = async (page = 1) => {
        setIsLoading(true);
        try {
            const res = await api.get(`/stock/exits?page=${page}`);
            setExits(res.data.data);
            setMeta(res.data.meta);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao carregar saídas');
        } finally {
            setIsLoading(false);
        }
    };

    const getExit = async (id: string) => {
        setIsLoading(true);
        try {
            const res = await api.get(`/stock/exits/${id}`);
            setCurrentExit(res.data);
            return res.data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao carregar detalhes');
        } finally {
            setIsLoading(false);
        }
    };

    const createDraft = async (data: CreateExitData) => {
        setIsLoading(true);
        try {
            const res = await api.post('/stock/exits', data);
            return res.data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao criar saída');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const addItem = async (exitId: string, data: AddExitItemData) => {
        try {
            await api.post(`/stock/exits/${exitId}/items`, data);
            await getExit(exitId);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao adicionar item');
            throw err;
        }
    };

    const removeItem = async (exitId: string, itemId: string) => {
        try {
            await api.delete(`/stock/exits/${exitId}/items/${itemId}`);
            await getExit(exitId);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao remover item');
        }
    };

    const confirmExit = async (exitId: string) => {
        try {
            setIsLoading(true);
            await api.post(`/stock/exits/${exitId}/confirm`);
            await getExit(exitId);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao confirmar saída');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const deleteExit = async (id: string) => {
        setIsLoading(true);
        try {
            await api.delete(`/stock/exits/${id}`);
            return true;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao excluir saída');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        exits,
        currentExit,
        meta,
        isLoading,
        error,
        fetchExits,
        getExit,
        createDraft,
        addItem,
        removeItem,
        confirmExit,
        deleteExit,
    };
}
