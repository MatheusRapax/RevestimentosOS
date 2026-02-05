import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

interface CreateUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: any) => Promise<void>;
    isSaving: boolean;
    tenants: { id: string; name: string }[];
}

const ROLES = [
    { key: 'CLINIC_ADMIN', label: 'Admin da Loja' },
    { key: 'MANAGER', label: 'Gerente' },
    { key: 'SELLER', label: 'Vendedor' },
    { key: 'ARCHITECT', label: 'Arquiteto' },
];

export function CreateUserDialog({ open, onOpenChange, onSave, isSaving, tenants }: CreateUserDialogProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        isSuperAdmin: false,
        clinicId: '',
        roleId: '', // We will send the KEY to the backend, backend needs to map it to ID. Wait, backend createTenants expects roleId?
        // Actually backend logic in previous step:
        // const adminRole = await tx.role.findFirst({ where: { key: 'CLINIC_ADMIN' } });
        // roleId: adminRole?.id;

        // Wait, the createUser backend method I wrote expects `roleId`. But the frontend only knows keys easier.
        // Let's check role mapping. If I send roleId I need the UUID.
        // I will update the backend to look up role by key if possible, OR I assume the frontend sends the UUID.
        // Since I don't have role UUIDs in frontend, I should change backend to accept `roleKey`.
    });

    // TEMPORARY FIX: I will modify the backend to accept roleKey instead of roleId to make it easier. 
    // For now let's build the UI assuming we send roleKey and I will fix the backend service next.

    // Changing strategy: backend expects roleId? Let's check my previous edit.
    // "roleId: data.roleId" in AdminService.createUser.
    // Yes, passed directly.

    // I need to fetch Roles to get IDs or change backend to lookup by Key.
    // Changing backend is better (more robust).

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(formData);
        setFormData({ name: '', email: '', password: '', isSuperAdmin: false, clinicId: '', roleId: '' });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Criar Novo Usuário</DialogTitle>
                    <DialogDescription>
                        Crie um usuário e vincule a uma loja.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Nome</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="password" className="text-right">Senha</Label>
                        <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            className="col-span-3"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="superAdmin" className="text-right">Acesso</Label>
                        <div className="col-span-3 flex items-center space-x-2">
                            <Checkbox
                                id="superAdmin"
                                checked={formData.isSuperAdmin}
                                onCheckedChange={(checked) => setFormData({ ...formData, isSuperAdmin: checked === true })}
                            />
                            <Label htmlFor="superAdmin">Super Admin</Label>
                        </div>
                    </div>

                    {!formData.isSuperAdmin && (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="clinic" className="text-right">Loja</Label>
                                <Select
                                    value={formData.clinicId}
                                    onValueChange={value => setFormData({ ...formData, clinicId: value })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Selecione uma loja" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tenants.map(tenant => (
                                            <SelectItem key={tenant.id} value={tenant.id}>
                                                {tenant.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="role" className="text-right">Função</Label>
                                <Select
                                    value={formData.roleId}
                                    onValueChange={value => setFormData({ ...formData, roleId: value })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Selecione uma função" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROLES.map(role => (
                                            <SelectItem key={role.key} value={role.key}>
                                                {role.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Criar Usuário
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
