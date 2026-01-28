import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Professional {
    id: string;
    name: string;
    email: string;
}

export function useProfessionals() {
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchProfessionals = async () => {
            try {
                setIsLoading(true);
                // Fetch professionals from new dedicated endpoint
                const response = await api.get('/professionals');
                setProfessionals(response.data || []);
                setError('');
            } catch (err) {
                console.error('Error fetching professionals:', err);
                setError('Erro ao carregar profissionais');
                setProfessionals([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfessionals();
    }, []);

    return { professionals, isLoading, error };
}
