
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Role, Permission } from '@/hooks/use-admin-roles';
import { Loader2 } from 'lucide-react';

interface RoleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    role?: Role;
    allPermissions: Permission[];
    onSave: (data: any) => Promise<void>;
}

export function RoleDialog({ open, onOpenChange, role, allPermissions, onSave }: RoleDialogProps) {
    const [name, setName] = useState('');
    const [key, setKey] = useState('');
    const [description, setDescription] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            if (role) {
                setName(role.name);
                setKey(role.key);
                setDescription(role.description || '');
                // Populate permissions
                const perms = new Set(role.rolePermissions.map(rp => rp.permission.key));
                setSelectedPermissions(perms);
            } else {
                setName('');
                setKey('');
                setDescription('');
                setSelectedPermissions(new Set());
            }
        }
    }, [open, role]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave({
                key: role ? undefined : key, // Key is immutable on edit usually
                name,
                description,
                permissionKeys: Array.from(selectedPermissions)
            });
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar papel');
        } finally {
            setIsSubmitting(false);
        }
    };

    const togglePermission = (permKey: string) => {
        const next = new Set(selectedPermissions);
        if (next.has(permKey)) {
            next.delete(permKey);
        } else {
            next.add(permKey);
        }
        setSelectedPermissions(next);
    };

    const toggleGroup = (permKeys: string[], shouldSelect: boolean) => {
        const next = new Set(selectedPermissions);
        permKeys.forEach(k => {
            if (shouldSelect) next.add(k);
            else next.delete(k);
        });
        setSelectedPermissions(next);
    };

    // Group Permissions by prefix (e.g., 'customer.read' -> 'customer')
    const groupedPermissions = allPermissions.reduce((acc, perm) => {
        const prefix = perm.key.split('.')[0] || 'other';
        if (!acc[prefix]) acc[prefix] = [];
        acc[prefix].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{role ? 'Editar Papel' : 'Novo Papel'}</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden">
                    <TabsList>
                        <TabsTrigger value="info">Informações Básicas</TabsTrigger>
                        <TabsTrigger value="permissions">Permissões ({selectedPermissions.size})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="space-y-4 py-4">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label>Nome do Papel</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Vendedor Sênior" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Chave (Identificador Único)</Label>
                                <Input
                                    value={key}
                                    onChange={e => setKey(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                                    placeholder="Ex: SENIOR_SELLER"
                                    disabled={!!role}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Descrição</Label>
                                <Textarea value={description} onChange={e => setDescription(e.target.value)} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="permissions" className="flex-1 flex flex-col overflow-hidden">
                        <ScrollArea className="h-[500px] pr-4">
                            <div className="space-y-6 py-4">
                                {Object.entries(groupedPermissions).map(([group, perms]) => {
                                    const allSelected = perms.every(p => selectedPermissions.has(p.key));

                                    return (
                                        <div key={group} className="border rounded-lg p-4 bg-slate-50">
                                            <div className="flex items-center justify-between mb-3 border-b pb-2">
                                                <h3 className="font-semibold capitalize text-slate-800">{group} Module</h3>
                                                <div className="space-x-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleGroup(perms.map(p => p.key), true)}
                                                        className="text-xs h-6"
                                                    >
                                                        Selecionar Todos
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleGroup(perms.map(p => p.key), false)}
                                                        className="text-xs h-6 text-red-500 hover:text-red-700"
                                                    >
                                                        Limpar
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {perms.map(perm => (
                                                    <div key={perm.id} className="flex items-start gap-2 p-2 bg-white rounded border hover:border-blue-300 transition-colors">
                                                        <Checkbox
                                                            id={perm.id}
                                                            checked={selectedPermissions.has(perm.key)}
                                                            onCheckedChange={() => togglePermission(perm.key)}
                                                        />
                                                        <div className="grid gap-0.5">
                                                            <label
                                                                htmlFor={perm.id}
                                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                            >
                                                                {perm.key}
                                                            </label>
                                                            {perm.description && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    {perm.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 pt-4 border-t mt-auto">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Alterações
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
