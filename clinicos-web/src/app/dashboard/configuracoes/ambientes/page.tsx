'use client';

import { useState } from 'react';
import { useEnvironments, Environment, CreateEnvironmentData } from '@/hooks/useEnvironments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Plus,
    Pencil,
    Trash2,
    LayoutGrid,
    Loader2,
    Shield
} from 'lucide-react';
import { toast } from 'sonner';

export default function AmbientesPage() {
    const { environments, isLoading, error, createEnvironment, updateEnvironment, deleteEnvironment } = useEnvironments();
    const [editingEnv, setEditingEnv] = useState<Environment | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState<CreateEnvironmentData>({ name: '', isActive: true });
    const [isSaving, setIsSaving] = useState(false);

    const handleOpenCreate = () => {
        setFormData({ name: '', isActive: true });
        setIsCreating(true);
    };

    const handleOpenEdit = (env: Environment) => {
        setFormData({
            name: env.name,
            isActive: env.isActive,
        });
        setEditingEnv(env);
    };

    const handleClose = () => {
        setIsCreating(false);
        setEditingEnv(null);
        setFormData({ name: '', isActive: true });
    };

    const handleSave = async () => {
        if (!formData.name) {
            toast.error('Nome é obrigatório');
            return;
        }
        setIsSaving(true);
        try {
            if (editingEnv) {
                await updateEnvironment(editingEnv.id, formData);
                toast.success('Ambiente atualizado!');
            } else {
                await createEnvironment(formData);
                toast.success('Ambiente criado!');
            }
            handleClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao salvar ambiente');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este ambiente? Ele pode estar associado a itens de orçamentos.')) return;
        try {
            await deleteEnvironment(id);
            toast.success('Ambiente excluído!');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao excluir ambiente');
        }
    };

    const updateField = (field: keyof CreateEnvironmentData, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <Card className="mt-8 border-destructive/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Shield className="h-12 w-12 text-destructive mb-4" />
                    <h2 className="text-xl font-bold text-destructive mb-2">Acesso Negado ou Erro</h2>
                    <p className="text-muted-foreground max-w-md">
                        {error}
                    </p>
                    <p className="text-sm text-muted-foreground mt-4">
                        Se você acredita que é um erro, verifique suas permissões com o administrador.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Ambientes de Venda</h1>
                    <p className="text-muted-foreground">
                        Configure os ambientes (ex: Cozinha, Sala, Banheiro) que poderão ser associados aos itens no orçamento.
                    </p>
                </div>
                <Button onClick={handleOpenCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Ambiente
                </Button>
            </div>

            {environments.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">Nenhum ambiente cadastrado</p>
                        <p className="text-muted-foreground mb-4">
                            Cadastre ambientes para poder separá-los durante as vendas e orçamentos.
                        </p>
                        <Button onClick={handleOpenCreate}>
                            <Plus className="h-4 w-4 mr-2" />
                            Criar Primeiro Ambiente
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {environments.map((env) => (
                        <Card key={env.id} className={!env.isActive ? 'opacity-60' : ''}>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                                        <CardTitle className="text-lg">{env.name}</CardTitle>
                                    </div>
                                    <Badge variant={env.isActive ? 'default' : 'secondary'}>
                                        {env.isActive ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => handleOpenEdit(env)}
                                >
                                    <Pencil className="h-4 w-4 mr-1" />
                                    Editar
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(env.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={isCreating || !!editingEnv} onOpenChange={handleClose}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingEnv ? 'Editar Ambiente' : 'Novo Ambiente'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nome do Ambiente *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                placeholder="Ex: Área Externa, Cozinha, Banheiro Suíte"
                                autoFocus
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>Ambiente Ativo</Label>
                            <Switch
                                checked={formData.isActive ?? true}
                                onCheckedChange={(v) => updateField('isActive', v)}
                            />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Ambientes inativos não aparecerão na lista de opções ao criar novos orçamentos.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleClose}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingEnv ? 'Salvar Alterações' : 'Criar Ambiente'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
