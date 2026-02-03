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
import { Loader2 } from 'lucide-react';
import { AdminUser, UpdateUserData } from '@/hooks/use-admin-users';

interface EditUserDialogProps {
    user: AdminUser | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: UpdateUserData) => Promise<void>;
    isSaving: boolean;
}

export function EditUserDialog({ user, open, onOpenChange, onSave, isSaving }: EditUserDialogProps) {
    const [formData, setFormData] = useState<Partial<UpdateUserData>>({});

    useEffect(() => {
        if (user) {
            setFormData({
                id: user.id,
                isActive: user.isActive,
                isSuperAdmin: user.isSuperAdmin,
                password: '', // Password starts empty
            });
        }
    }, [user]);

    const handleSave = () => {
        if (!user) return;
        onSave({
            id: user.id,
            isActive: formData.isActive,
            isSuperAdmin: formData.isSuperAdmin,
            ...(formData.password ? { password: formData.password } : {}),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
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
                                Usuário Ativo (Pode logar)
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
                            placeholder="Deixe em branco para manter"
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
