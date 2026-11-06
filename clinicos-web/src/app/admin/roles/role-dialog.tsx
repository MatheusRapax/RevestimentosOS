
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
import { PermissionPicker, PermissaoDaApi } from '@/components/admin/permission-picker';

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
                            <div className="py-4">
                                <PermissionPicker
                                    permissoes={allPermissions as PermissaoDaApi[]}
                                    selecionadas={selectedPermissions}
                                    idDe={(perm) => perm.key}
                                    onAlterar={(ids, marcar) => toggleGroup(ids, marcar)}
                                />
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
