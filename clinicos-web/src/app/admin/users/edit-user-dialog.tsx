'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { AdminUser, UpdateUserData } from '@/hooks/use-admin-users';
import { useAdminRoles } from '@/hooks/use-admin-roles';

interface EditUserDialogProps {
    user: AdminUser | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: UpdateUserData) => Promise<void>;
    isSaving: boolean;
    tenants: any[]; // Available tenants to link
}

export function EditUserDialog({ user, open, onOpenChange, onSave, isSaving, tenants }: EditUserDialogProps) {
    const { roles } = useAdminRoles(); // Fetch global roles
    const [formData, setFormData] = useState<Partial<UpdateUserData & { clinicRoles?: { clinicId: string, roleId: string }[] }>>({
        clinicRoles: []
    });

    useEffect(() => {
        if (user && open) {
            setFormData({
                id: user.id,
                isActive: user.isActive,
                isSuperAdmin: user.isSuperAdmin,
                password: '', // Password starts empty
                clinicRoles: user.clinicUsers?.map((cu: any) => ({
                    clinicId: cu.clinic.id,
                    roleId: cu.role.id || roles.find(r => r.key === 'CLINIC_ADMIN')?.id // Fallback or current
                })) || [],
            });
        }
    }, [user, open, roles]);

    const handleSave = () => {
        if (!user) return;

        // Transform clinicRoles to format expected by hook/backend if needed
        // Note: The hook interface might need update, but we can pass ANY object for now or update Type later
        onSave({
            id: user.id,
            isActive: formData.isActive,
            isSuperAdmin: formData.isSuperAdmin,
            ...(formData.password ? { password: formData.password } : {}),
            clinicRoles: formData.clinicRoles,
        } as any);
    };

    const toggleTenant = (tenantId: string) => {
        setFormData(prev => {
            const current = prev.clinicRoles || [];
            const exists = current.find(cr => cr.clinicId === tenantId);

            if (exists) {
                // Remove
                return { ...prev, clinicRoles: current.filter(cr => cr.clinicId !== tenantId) };
            } else {
                // Add with default role (CLINIC_ADMIN or first available)
                const defaultRole = roles.find(r => r.key === 'CLINIC_ADMIN') || roles[0];
                if (!defaultRole) return prev; // Should not happen if roles loaded

                return { ...prev, clinicRoles: [...current, { clinicId: tenantId, roleId: defaultRole.id }] };
            }
        });
    };

    const updateTenantRole = (tenantId: string, roleId: string) => {
        setFormData(prev => {
            const current = prev.clinicRoles || [];
            return {
                ...prev,
                clinicRoles: current.map(cr => cr.clinicId === tenantId ? { ...cr, roleId } : cr)
            };
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Usuário</DialogTitle>
                    <DialogDescription>
                        Gerencie o acesso e permissões de {user?.name || user?.email}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="isActive" className="text-right">
                            Status
                        </Label>
                        <div className="col-span-3 flex items-center space-x-2">
                            <Checkbox
                                id="isActive"
                                checked={formData.isActive}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked === true }))}
                            />
                            <Label htmlFor="isActive" className="font-normal cursor-pointer">
                                Usuário Ativo
                            </Label>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="isSuperAdmin" className="text-right">
                            Super Admin
                        </Label>
                        <div className="col-span-3 flex items-center space-x-2">
                            <Checkbox
                                id="isSuperAdmin"
                                checked={formData.isSuperAdmin}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isSuperAdmin: checked === true }))}
                            />
                            <Label htmlFor="isSuperAdmin" className="font-normal cursor-pointer text-red-600 font-medium">
                                Acesso Total (Cuidado)
                            </Label>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">
                            Acesso às Lojas
                        </Label>
                        <div className="col-span-3 space-y-3 border rounded-md p-3 max-h-60 overflow-y-auto bg-slate-50">
                            {tenants.map((tenant) => {
                                const assignment = formData.clinicRoles?.find(cr => cr.clinicId === tenant.id);
                                const isChecked = !!assignment;

                                return (
                                    <div key={tenant.id} className="flex items-center justify-between p-2 bg-white rounded border">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`tenant-${tenant.id}`}
                                                checked={isChecked}
                                                onCheckedChange={() => toggleTenant(tenant.id)}
                                            />
                                            <Label htmlFor={`tenant-${tenant.id}`} className="font-medium cursor-pointer text-sm">
                                                {tenant.name}
                                            </Label>
                                        </div>

                                        {isChecked && (
                                            <Select
                                                value={assignment.roleId}
                                                onValueChange={(val) => updateTenantRole(tenant.id, val)}
                                            >
                                                <SelectTrigger className="w-[180px] h-8 text-xs">
                                                    <SelectValue placeholder="Selecione o papel" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {roles.map(role => (
                                                        <SelectItem key={role.id} value={role.id} className="text-xs">
                                                            {role.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                );
                            })}
                            {tenants.length === 0 && <span className="text-sm text-muted-foreground">Nenhuma loja cadastrada.</span>}
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4 border-t pt-4 mt-2">
                        <Label htmlFor="password" className="text-right">
                            Nova Senha
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                            className="col-span-3"
                            placeholder="*************"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Alterações
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

