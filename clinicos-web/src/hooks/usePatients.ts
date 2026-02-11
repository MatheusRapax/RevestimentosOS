import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Patient {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    document?: string;
    isActive: boolean;
}

export function usePatients() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                setIsLoading(true);
                const response = await api.get('/patients');
                setPatients(response.data);
                setError('');
            } catch (err) {
                console.error('Error fetching patients:', err);
                setError('Erro ao carregar clientes');
                setPatients([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPatients();
    }, []);

    return { patients, isLoading, error };
}
