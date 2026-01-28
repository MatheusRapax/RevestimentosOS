import { useState } from 'react';
import api from '@/lib/api';

export interface StockEntryItem {
    id: string;
    stockEntryId: string;
    productId: string;
    product: {
        name: string;
        unit?: string;
    };
    quantity: number;
    unitCost?: number;
    totalCost?: number;
    lotNumber?: string;
    expirationDate?: string;
    manufacturer?: string;
}

export interface StockEntry {
    id: string;
    status: 'DRAFT' | 'CONFIRMED' | 'CANCELED';
    type: 'INVOICE' | 'MANUAL' | 'DONATION' | 'RETURN';
    invoiceNumber?: string;
    series?: string;
    supplierId?: string;
    supplierName?: string;
    emissionDate?: string;
    arrivalDate: string; // ISO
    totalValue?: number;
    notes?: string;
    createdAt: string;
    items?: StockEntryItem[];
}

export interface CreateEntryData {
    type?: string;
    invoiceNumber?: string;
    series?: string;
    supplierName?: string;
    emissionDate?: string;
    arrivalDate?: string;
    notes?: string;
}

export interface AddItemData {
    productId: string;
    quantity: number;
    unitCost?: number;
    lotNumber?: string;
    expirationDate?: string;
    manufacturer?: string;
}

export function useStockEntries() {
    const [entries, setEntries] = useState<StockEntry[]>([]);
    const [currentEntry, setCurrentEntry] = useState<StockEntry | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

    const fetchEntries = async (page = 1) => {
        setIsLoading(true);
        try {
            const res = await api.get(`/stock/entries?page=${page}`);
            setEntries(res.data.data);
            setMeta(res.data.meta);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao carregar entradas');
        } finally {
            setIsLoading(false);
        }
    };

    const getEntry = async (id: string) => {
        setIsLoading(true);
        try {
            const res = await api.get(`/stock/entries/${id}`);
            setCurrentEntry(res.data);
            return res.data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao carregar detalhes');
        } finally {
            setIsLoading(false);
        }
    };

    const createDraft = async (data: CreateEntryData) => {
        setIsLoading(true);
        try {
            const res = await api.post('/stock/entries', data);
            return res.data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao criar rascunho');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const addItem = async (entryId: string, data: AddItemData) => {
        try {
            await api.post(`/stock/entries/${entryId}/items`, data);
            await getEntry(entryId); // Refresh current entry
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao adicionar item');
            throw err;
        }
    };

    const removeItem = async (entryId: string, itemId: string) => {
        try {
            await api.delete(`/stock/entries/${entryId}/items/${itemId}`);
            await getEntry(entryId);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao remover item');
        }
    };

    const confirmEntry = async (entryId: string) => {
        try {
            setIsLoading(true);
            await api.post(`/stock/entries/${entryId}/confirm`);
            await getEntry(entryId);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao confirmar entrada');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        entries,
        currentEntry,
        meta,
        isLoading,
        error,
        fetchEntries,
        getEntry,
        createDraft,
        addItem,
        removeItem,
        confirmEntry,
    };
}
