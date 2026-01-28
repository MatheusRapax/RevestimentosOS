import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Professional {
    id: string;
    name: string;
    email: string;
    active: boolean;
}

export function useProfessionalsAdmin() {
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchProfessionals = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/professionals');
            setProfessionals(response.data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    const activate = async (userId: string) => {
        // Optimistic update
        setProfessionals((prev) =>
            prev.map((p) => (p.id === userId ? { ...p, active: true } : p))
        );

        try {
            await api.patch(`/professionals/${userId}/activate`);
            await fetchProfessionals(); // Refresh to ensure consistency
        } catch (error: any) {
            // Rollback optimistic update
            setProfessionals((prev) =>
                prev.map((p) => (p.id === userId ? { ...p, active: false } : p))
            );
            throw error;
        }
    };

    const deactivate = async (userId: string) => {
        // Optimistic update
        setProfessionals((prev) =>
            prev.map((p) => (p.id === userId ? { ...p, active: false } : p))
        );

        try {
            await api.patch(`/professionals/${userId}/deactivate`);
            await fetchProfessionals(); // Refresh to ensure consistency
        } catch (error: any) {
            // Rollback optimistic update
            setProfessionals((prev) =>
                prev.map((p) => (p.id === userId ? { ...p, active: true } : p))
            );
            throw error;
        }
    };

    useEffect(() => {
        fetchProfessionals();
    }, []);

    return {
        professionals,
        loading,
        error,
        activate,
        deactivate,
        refetch: fetchProfessionals,
    };
}
