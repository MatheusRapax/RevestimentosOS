'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

export type CommissionTargetType = 'SELLER' | 'ARCHITECT';
export type CommissionGoalPeriod = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'ANNUALLY';

export interface CommissionTier {
    id?: string;
    commissionRuleId?: string;
    minGoalAmount: number;
    commissionRate: number;
}

export interface CommissionRule {
    id: string;
    clinicId: string;
    name: string;
    targetType: CommissionTargetType;
    goalPeriod: CommissionGoalPeriod;
    isGlobal: boolean;
    isActive: boolean;
    tiers: CommissionTier[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateCommissionRuleData {
    name: string;
    targetType: CommissionTargetType;
    goalPeriod?: CommissionGoalPeriod;
    isGlobal?: boolean;
    isActive?: boolean;
    tiers?: Omit<CommissionTier, 'id' | 'commissionRuleId'>[];
}

export function useCommissions() {
    const [rules, setRules] = useState<CommissionRule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRules = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data } = await api.get('/commissions');
            setRules(Array.isArray(data) ? data : []);
        } catch (err: any) {
            if (err?.response?.status) {
                setError(err.response?.data?.message || 'Erro ao carregar regras de comissão');
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRules();
    }, [fetchRules]);

    const createRule = async (data: CreateCommissionRuleData) => {
        const { data: newRule } = await api.post('/commissions', data);
        setRules((prev) => [...prev, newRule]);
        return newRule;
    };

    const updateRule = async (id: string, data: Partial<CreateCommissionRuleData>) => {
        const { data: updated } = await api.patch(`/commissions/${id}`, data);
        setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
        return updated;
    };

    const deleteRule = async (id: string) => {
        await api.delete(`/commissions/${id}`);
        setRules((prev) => prev.filter((r) => r.id !== id));
    };

    return {
        rules,
        isLoading,
        error,
        fetchRules,
        createRule,
        updateRule,
        deleteRule,
    };
}
