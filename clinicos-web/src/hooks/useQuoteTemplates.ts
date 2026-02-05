'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

export interface QuoteTemplate {
    id: string;
    clinicId: string;
    name: string;
    isDefault: boolean;
    // Dados da Empresa
    companyName?: string;
    companyLogo?: string;
    companyPhone?: string;
    companyEmail?: string;
    companyAddress?: string;
    companyCnpj?: string;
    // Dados Bancários
    bankName?: string;
    bankAgency?: string;
    bankAccount?: string;
    bankAccountHolder?: string;
    bankCnpj?: string;
    pixKey?: string;
    // Termos
    termsAndConditions?: string;
    validityDays: number;
    validityText?: string;
    defaultDeliveryDays?: string;
    // Visual
    primaryColor: string;
    accentColor: string;
    showSignatureLines: boolean;
    showBankDetails: boolean;
    showTerms: boolean;
    footerText?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateQuoteTemplateData {
    name: string;
    isDefault?: boolean;
    companyName?: string;
    companyLogo?: string;
    companyPhone?: string;
    companyEmail?: string;
    companyAddress?: string;
    companyCnpj?: string;
    bankName?: string;
    bankAgency?: string;
    bankAccount?: string;
    bankAccountHolder?: string;
    bankCnpj?: string;
    pixKey?: string;
    termsAndConditions?: string;
    validityDays?: number;
    validityText?: string;
    defaultDeliveryDays?: string;
    primaryColor?: string;
    accentColor?: string;
    showSignatureLines?: boolean;
    showBankDetails?: boolean;
    showTerms?: boolean;
    footerText?: string;
}

export function useQuoteTemplates() {
    const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTemplates = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data } = await api.get('/quotes/templates');
            setTemplates(data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao carregar templates');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const createTemplate = async (data: CreateQuoteTemplateData) => {
        const { data: newTemplate } = await api.post('/quotes/templates', data);
        setTemplates((prev) => [...prev, newTemplate]);
        return newTemplate;
    };

    const updateTemplate = async (id: string, data: Partial<CreateQuoteTemplateData>) => {
        const { data: updated } = await api.patch(`/quotes/templates/${id}`, data);
        setTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)));
        return updated;
    };

    const deleteTemplate = async (id: string) => {
        await api.delete(`/quotes/templates/${id}`);
        setTemplates((prev) => prev.filter((t) => t.id !== id));
    };

    const setDefault = async (id: string) => {
        const { data: updated } = await api.post(`/quotes/templates/${id}/set-default`);
        setTemplates((prev) =>
            prev.map((t) => ({
                ...t,
                isDefault: t.id === id,
            }))
        );
        return updated;
    };

    const getDefault = async (): Promise<QuoteTemplate | null> => {
        try {
            const { data } = await api.get('/quotes/templates/default');
            return data;
        } catch {
            return null;
        }
    };

    return {
        templates,
        isLoading,
        error,
        fetchTemplates,
        createTemplate,
        updateTemplate,
        deleteTemplate,
        setDefault,
        getDefault,
    };
}
