'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

export interface Environment {
    id: string;
    clinicId: string;
    name: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateEnvironmentData {
    name: string;
    isActive?: boolean;
}

export function useEnvironments() {
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEnvironments = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data } = await api.get('/environments');
            setEnvironments(Array.isArray(data) ? data : []);
        } catch (err: any) {
            if (err?.response?.status) {
                setError(err.response?.data?.message || 'Erro ao carregar os ambientes');
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEnvironments();
    }, [fetchEnvironments]);

    const createEnvironment = async (data: CreateEnvironmentData) => {
        const { data: newEnv } = await api.post('/environments', data);
        setEnvironments((prev) => [...prev, newEnv]);
        return newEnv;
    };

    const updateEnvironment = async (id: string, data: Partial<CreateEnvironmentData>) => {
        const { data: updated } = await api.patch(`/environments/${id}`, data);
        setEnvironments((prev) => prev.map((e) => (e.id === id ? updated : e)));
        return updated;
    };

    const deleteEnvironment = async (id: string) => {
        await api.delete(`/environments/${id}`);
        setEnvironments((prev) => prev.filter((e) => e.id !== id));
    };

    return {
        environments,
        isLoading,
        error,
        fetchEnvironments,
        createEnvironment,
        updateEnvironment,
        deleteEnvironment,
    };
}
