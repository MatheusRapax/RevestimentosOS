'use client';

import { useState } from 'react';
import { useCommissions, CommissionRule, CommissionTargetType } from '@/hooks/useCommissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Placeholder for dialog form (to be implemented next)
import { CommissionRuleDialog } from './commission-rule-dialog';

export default function CommissionsConfigPage() {
    const { rules, isLoading, deleteRule, fetchRules } = useCommissions();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
    const [activeTab, setActiveTab] = useState<CommissionTargetType>('SELLER');

    const handleCreateClick = () => {
        setEditingRule(null);
        setIsDialogOpen(true);
    };

    const handleEditClick = (rule: CommissionRule) => {
        setEditingRule(rule);
        setIsDialogOpen(true);
    };

    const handleDeleteClick = async (rule: CommissionRule) => {
        if (!confirm('Tem certeza que deseja remover esta regra de comissão?')) return;
        try {
            await deleteRule(rule.id);
            toast.success('Regra removida com sucesso');
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Erro ao remover regra');
        }
    };

    const renderRulesList = (targetType: CommissionTargetType) => {
        const filteredRules = rules.filter(r => r.targetType === targetType);

        if (isLoading) {
            return (
                <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
            );
        }

        if (filteredRules.length === 0) {
            return (
                <div className="text-center p-8 text-slate-500 border rounded-lg border-dashed">
                    Nenhuma regra configurada.
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {filteredRules.map(rule => (
                    <Card key={rule.id}>
                        <CardHeader className="pb-3 flex flex-row items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-lg">{rule.name}</CardTitle>
                                    {rule.isGlobal && <Badge variant="default">Regra Global (Padrão)</Badge>}
                                    {!rule.isActive && <Badge variant="secondary">Inativo</Badge>}
                                </div>
                                <CardDescription>
                                    Apuração: {
                                        rule.goalPeriod === 'WEEKLY' ? 'Semanal' :
                                        rule.goalPeriod === 'MONTHLY' ? 'Mensal' :
                                        rule.goalPeriod === 'QUARTERLY' ? 'Trimestral' :
                                        rule.goalPeriod === 'SEMIANNUALLY' ? 'Semestral' :
                                        rule.goalPeriod === 'ANNUALLY' ? 'Anual' : rule.goalPeriod
                                    }
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="icon" onClick={() => handleEditClick(rule)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="destructive" size="icon" onClick={() => handleDeleteClick(rule)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-slate-50 rounded-md p-4">
                                <h4 className="text-sm font-medium mb-3">Tiers de Comissão (Progresso)</h4>
                                {rule.tiers && rule.tiers.length > 0 ? (
                                    <div className="space-y-2">
                                        {rule.tiers.map((tier, idx) => (
                                            <div key={tier.id || idx} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                                                <span>A partir de <strong>R$ {(tier.minGoalAmount / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                                                <Badge variant="outline">{tier.commissionRate}% de Comissão</Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 italic">Nenhum tier configurado. A comissão pode ser 0%.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto py-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Regras de Comissão</h2>
                    <p className="text-slate-500">Configure as regras de comissionamento e metas para Vendedores e Arquitetos.</p>
                </div>
                <Button onClick={handleCreateClick}>
                    <Plus className="mr-2 h-4 w-4" /> Nova Regra
                </Button>
            </div>

            <Tabs defaultValue="SELLER" value={activeTab} onValueChange={(val) => setActiveTab(val as CommissionTargetType)}>
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="SELLER">Vendedores</TabsTrigger>
                    <TabsTrigger value="ARCHITECT">Arquitetos</TabsTrigger>
                </TabsList>
                
                <TabsContent value="SELLER" className="mt-6">
                    {renderRulesList('SELLER')}
                </TabsContent>
                
                <TabsContent value="ARCHITECT" className="mt-6">
                    {renderRulesList('ARCHITECT')}
                </TabsContent>
            </Tabs>

            <CommissionRuleDialog 
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                rule={editingRule}
                targetType={activeTab}
                onSuccess={() => {
                    setIsDialogOpen(false);
                    fetchRules();
                }}
            />
        </div>
    );
}
