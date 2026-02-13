'use client';

import { useState } from 'react';
import { useAdminTenants, CreateTenantData } from '@/hooks/use-admin-tenants';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';

const AVAILABLE_MODULES = [
    { id: 'SALES', label: 'Vendas (CRM, Pedidos)' },
    { id: 'STOCK', label: 'Estoque' },
    { id: 'PURCHASES', label: 'Compras' },
    { id: 'FINANCE', label: 'Financeiro' },
    { id: 'ARCHITECTS', label: 'Arquitetos' },
    { id: 'DELIVERIES', label: 'Entregas' },
    { id: 'FISCAL', label: 'Fiscal (NF-e/NFC-e)' },
    { id: 'ADMIN', label: 'Administrativo (Usuários, Config)' },
];

export default function TenantsPage() {
    const { tenants, isLoading, createTenant, updateTenant } = useAdminTenants();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<CreateTenantData>({
        name: '',
        slug: '',
        modules: ['SALES', 'STOCK', 'FINANCE', 'PURCHASES'], // Defaults
        logoUrl: '',
        isActive: true,
    });

    const handleCreate = async () => {
        try {
            const { isActive, ...dataToSend } = formData;
            await createTenant.mutateAsync(dataToSend);
            toast.success('Loja criada com sucesso!');
            setIsCreateOpen(false);
            setFormData({ name: '', slug: '', modules: ['SALES', 'STOCK', 'FINANCE'], logoUrl: '', isActive: true });
        } catch (error) {
            toast.error('Erro ao criar loja.');
            console.error(error);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            const response = await api.post('/admin/upload', uploadData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setFormData(prev => ({ ...prev, logoUrl: response.data.url }));
            toast.success('Logo enviada com sucesso!');
        } catch (error) {
            toast.error('Erro ao enviar logo.');
            console.error(error);
        }
    };

    const handleEditClick = (tenant: any) => {
        setEditingId(tenant.id);
        setFormData({
            name: tenant.name,
            slug: tenant.slug,
            modules: tenant.modules || [],
            logoUrl: tenant.logoUrl || '',
            isActive: tenant.isActive,
        });
        setIsEditOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingId) return;
        try {
            await updateTenant.mutateAsync({ id: editingId, ...formData });
            toast.success('Loja atualizada com sucesso!');
            setIsEditOpen(false);
            setEditingId(null);
            setFormData({ name: '', slug: '', modules: ['SALES', 'STOCK', 'FINANCE'], logoUrl: '', isActive: true });
        } catch (error) {
            toast.error('Erro ao atualizar loja.');
            console.error(error);
        }
    };

    const toggleModule = (moduleId: string) => {
        setFormData(prev => {
            const exists = prev.modules.includes(moduleId);
            if (exists) {
                return { ...prev, modules: prev.modules.filter(m => m !== moduleId) };
            } else {
                return { ...prev, modules: [...prev.modules, moduleId] };
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Gerenciar Lojas</h2>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setFormData({ name: '', slug: '', modules: ['SALES', 'STOCK', 'FINANCE'], logoUrl: '', isActive: true })}>
                            <Plus className="mr-2 h-4 w-4" /> Nova Loja
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Criar Nova Loja</DialogTitle>
                            <DialogDescription>
                                Adicione um novo tenant ao sistema. O slug deve ser único.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Nome
                                </Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="col-span-3"
                                    placeholder="Minha Loja de Pisos"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="slug" className="text-right">
                                    Slug
                                </Label>
                                <Input
                                    id="slug"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    className="col-span-3"
                                    placeholder="minha-loja"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="logoUrl" className="text-right">
                                    Logo URL
                                </Label>
                                <Input
                                    id="logoUrl"
                                    value={formData.logoUrl}
                                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                                    className="col-span-3"
                                    placeholder="https://exemplo.com/logo.png"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="file-upload" className="text-right">
                                    Upload Logo
                                </Label>
                                <div className="col-span-3">
                                    <Label htmlFor="file-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-md text-sm font-medium transition-colors">
                                        <Upload className="w-4 h-4" />
                                        Escolher Arquivo
                                    </Label>
                                    <Input
                                        id="file-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                    {formData.logoUrl && (
                                        <span className="ml-2 text-xs text-green-600">Logo carregada!</span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label className="text-right pt-2">
                                    Módulos
                                </Label>
                                <div className="col-span-3 space-y-2">
                                    {AVAILABLE_MODULES.map((module) => (
                                        <div key={module.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`mod-${module.id}`}
                                                checked={formData.modules.includes(module.id)}
                                                onCheckedChange={() => toggleModule(module.id)}
                                            />
                                            <Label htmlFor={`mod-${module.id}`} className="font-normal text-sm cursor-pointer">
                                                {module.label}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate} disabled={createTenant.isPending}>
                                {createTenant.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Criar Loja
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Editar Loja</DialogTitle>
                            <DialogDescription>
                                Atualize as informações da loja.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-name" className="text-right">
                                    Nome
                                </Label>
                                <Input
                                    id="edit-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-slug" className="text-right">
                                    Slug
                                </Label>
                                <Input
                                    id="edit-slug"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-logoUrl" className="text-right">
                                    Logo URL
                                </Label>
                                <Input
                                    id="edit-logoUrl"
                                    value={formData.logoUrl}
                                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                                    className="col-span-3"
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-file-upload" className="text-right">
                                    Upload Logo
                                </Label>
                                <div className="col-span-3">
                                    <Label htmlFor="edit-file-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-md text-sm font-medium transition-colors">
                                        <Upload className="w-4 h-4" />
                                        Escolher Arquivo
                                    </Label>
                                    <Input
                                        id="edit-file-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                    {formData.logoUrl && (
                                        <span className="ml-2 text-xs text-green-600">Logo carregada!</span>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-active" className="text-right">
                                    Ativo
                                </Label>
                                <div className="col-span-3 flex items-center space-x-2">
                                    <Checkbox
                                        id="edit-active"
                                        checked={formData.isActive}
                                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked === true })}
                                    />
                                    <Label htmlFor="edit-active" className="font-normal text-sm cursor-pointer">
                                        Loja Ativa
                                    </Label>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label className="text-right pt-2">
                                    Módulos
                                </Label>
                                <div className="col-span-3 space-y-2">
                                    {AVAILABLE_MODULES.map((module) => (
                                        <div key={`edit-${module.id}`} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`edit-mod-${module.id}`}
                                                checked={formData.modules.includes(module.id)}
                                                onCheckedChange={() => toggleModule(module.id)}
                                            />
                                            <Label htmlFor={`edit-mod-${module.id}`} className="font-normal text-sm cursor-pointer">
                                                {module.label}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleUpdate} disabled={updateTenant.isPending}>
                                {updateTenant.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Alterações
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Slug</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Módulos Ativos</TableHead>
                            <TableHead>Usuários</TableHead>
                            <TableHead>Criado em</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                                </TableCell>
                            </TableRow>
                        ) : tenants?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                    Nenhuma loja encontrada.
                                </TableCell>
                            </TableRow>
                        ) : (
                            tenants?.map((tenant) => (
                                <TableRow key={tenant.id}>
                                    <TableCell className="font-medium">{tenant.name}</TableCell>
                                    <TableCell className="text-slate-500">{tenant.slug}</TableCell>
                                    <TableCell>
                                        <Badge variant={tenant.isActive ? 'default' : 'secondary'}>
                                            {tenant.isActive ? 'Ativo' : 'Inativo'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {tenant.modules?.map(m => (
                                                <Badge key={m} variant="outline" className="text-[10px] px-1 py-0 h-5">
                                                    {m}
                                                </Badge>
                                            ))}
                                            {(!tenant.modules || tenant.modules.length === 0) && (
                                                <span className="text-xs text-slate-400">-</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{tenant._count?.clinicUsers || 0}</TableCell>
                                    <TableCell className="text-slate-500 text-sm">
                                        {format(new Date(tenant.createdAt), 'dd/MM/yyyy')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(tenant)}>
                                            Editar
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
