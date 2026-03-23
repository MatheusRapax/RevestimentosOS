'use client';

import { useState, useEffect } from 'react';
import { CommissionRule, CommissionTargetType, CommissionGoalPeriod, useCommissions } from '@/hooks/useCommissions';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CommissionRuleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    rule: CommissionRule | null;
    targetType: CommissionTargetType;
    onSuccess: () => void;
}

export function CommissionRuleDialog({ open, onOpenChange, rule, targetType, onSuccess }: CommissionRuleDialogProps) {
    const { createRule, updateRule } = useCommissions();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        goalPeriod: 'MONTHLY' as CommissionGoalPeriod,
        isGlobal: false,
        isActive: true,
        tiers: [{ minGoalAmount: 0, commissionRate: 0 }]
    });

    useEffect(() => {
        if (rule) {
            setFormData({
                name: rule.name,
                goalPeriod: rule.goalPeriod,
                isGlobal: rule.isGlobal,
                isActive: rule.isActive,
                tiers: rule.tiers && rule.tiers.length > 0 
                    ? rule.tiers.map(t => ({ minGoalAmount: t.minGoalAmount / 100, commissionRate: t.commissionRate }))
                    : [{ minGoalAmount: 0, commissionRate: 0 }]
            });
        } else {
            setFormData({
                name: '',
                goalPeriod: 'MONTHLY',
                isGlobal: false,
                isActive: true,
                tiers: [{ minGoalAmount: 0, commissionRate: 0 }]
            });
        }
    }, [rule, open]);

    const handleAddTier = () => {
        setFormData(prev => ({
            ...prev,
            tiers: [...prev.tiers, { minGoalAmount: 0, commissionRate: 0 }]
        }));
    };

    const handleRemoveTier = (index: number) => {
        setFormData(prev => ({
            ...prev,
            tiers: prev.tiers.filter((_, i) => i !== index)
        }));
    };

    const handleTierChange = (index: number, field: 'minGoalAmount' | 'commissionRate', value: string) => {
        const numValue = parseFloat(value) || 0;
        setFormData(prev => {
            const newTiers = [...prev.tiers];
            newTiers[index] = { ...newTiers[index], [field]: numValue };
            return { ...prev, tiers: newTiers };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const dataToSubmit = {
                ...formData,
                targetType,
                // Convert to cents before sending
                tiers: formData.tiers.map(t => ({
                    minGoalAmount: Math.round(t.minGoalAmount * 100),
                    commissionRate: t.commissionRate
                }))
            };

            if (rule) {
                await updateRule(rule.id, dataToSubmit);
                toast.success('Regra atualizada com sucesso');
            } else {
                await createRule(dataToSubmit);
                toast.success('Regra criada com sucesso');
            }
            onSuccess();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Erro ao salvar a regra');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{rule ? 'Editar Regra de Comissão' : 'Nova Regra de Comissão'}</DialogTitle>
                    <DialogDescription>
                        Configure as metas financeiras e as comissões pagas por faixa atingida.
                    </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="name">Nome da Regra</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Ex: Vendedores Ouro"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="goalPeriod">Período de Apuração</Label>
                            <Select 
                                value={formData.goalPeriod} 
                                onValueChange={(val) => setFormData(prev => ({ ...prev, goalPeriod: val as CommissionGoalPeriod }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="WEEKLY">Semanal</SelectItem>
                                    <SelectItem value="MONTHLY">Mensal</SelectItem>
                                    <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                                    <SelectItem value="SEMIANNUALLY">Semestral</SelectItem>
                                    <SelectItem value="ANNUALLY">Anual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="flex flex-row items-center space-x-2">
                            <Checkbox 
                                id="isGlobal" 
                                checked={formData.isGlobal}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isGlobal: checked === true }))}
                            />
                            <Label htmlFor="isGlobal" className="cursor-pointer">
                                <strong>Regra Global Padrão</strong> (Aplica a quem não tem regra específica)
                            </Label>
                        </div>
                        <div className="flex flex-row items-center space-x-2">
                            <Checkbox 
                                id="isActive" 
                                checked={formData.isActive}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked === true }))}
                            />
                            <Label htmlFor="isActive" className="cursor-pointer">Ativo</Label>
                        </div>
                    </div>

                    <div className="space-y-4 border-t pt-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-medium text-sm">Escalonamento de Metas (Tiers)</h4>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddTier}>
                                <Plus className="h-4 w-4 mr-2" />
                                Adicionar Meta
                            </Button>
                        </div>

                        <div className="space-y-3 bg-slate-50 p-4 rounded-md border">
                            {formData.tiers.map((tier, idx) => (
                                <div key={idx} className="flex gap-4 items-end">
                                    <div className="space-y-2 flex-1">
                                        <Label className="text-xs">A partir de (R$)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={tier.minGoalAmount}
                                            onChange={(e) => handleTierChange(idx, 'minGoalAmount', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        <Label className="text-xs">Taxa de Comissão (%)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={tier.commissionRate}
                                            onChange={(e) => handleTierChange(idx, 'commissionRate', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <Button 
                                        type="button" 
                                        variant="destructive" 
                                        size="icon" 
                                        onClick={() => handleRemoveTier(idx)}
                                        disabled={formData.tiers.length === 1}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Regra
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
