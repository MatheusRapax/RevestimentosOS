'use client';

import { useState } from 'react';
import api from '@/lib/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HardHat, Loader2 } from 'lucide-react';
import { maskPhone, maskCPF, unmask } from '@/lib/masks';

interface QuickArchitect {
    id: string;
    name: string;
    phone?: string;
    email?: string;
}

interface QuickArchitectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (architect: QuickArchitect) => void;
}

export function QuickArchitectDialog({
    open,
    onOpenChange,
    onCreated,
}: QuickArchitectDialogProps) {
    const [name, setName] = useState('');
    const [document, setDocument] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('O nome do arquiteto é obrigatório.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const res = await api.post('/architects', {
                name: name.trim(),
                document: document ? unmask(document) : undefined,
                phone: phone ? unmask(phone) : undefined,
                email: email.trim() || undefined,
            });

            onCreated(res.data);
            resetForm();
            onOpenChange(false);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Erro ao criar arquiteto. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setName('');
        setDocument('');
        setPhone('');
        setEmail('');
        setError('');
    };

    const handleOpenChange = (val: boolean) => {
        if (!val) resetForm();
        onOpenChange(val);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
                            <HardHat className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <DialogTitle>Novo Arquiteto Rápido</DialogTitle>
                            <DialogDescription>
                                Preencha apenas o necessário. Os demais dados podem ser completados depois.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div className="space-y-2">
                        <Label htmlFor="qa-name">
                            Nome <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="qa-name"
                            placeholder="Ex: Ana Oliveira"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="qa-document">CPF</Label>
                        <Input
                            id="qa-document"
                            placeholder="000.000.000-00"
                            value={document}
                            onChange={(e) => setDocument(maskCPF(e.target.value))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="qa-phone">Telefone</Label>
                        <Input
                            id="qa-phone"
                            placeholder="(99) 99999-9999"
                            value={phone}
                            onChange={(e) => setPhone(maskPhone(e.target.value))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="qa-email">Email</Label>
                        <Input
                            id="qa-email"
                            type="email"
                            placeholder="ana@escritorio.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 rounded-md bg-red-50 px-3 py-2">
                            {error}
                        </p>
                    )}

                    <p className="text-xs text-gray-500 border-t pt-3">
                        💡 Após salvar o orçamento, você poderá completar os dados cadastrais do arquiteto.
                    </p>

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading || !name.trim()} className="bg-amber-600 hover:bg-amber-700">
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Criando...
                                </>
                            ) : (
                                <>
                                    <HardHat className="mr-2 h-4 w-4" />
                                    Criar Arquiteto
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
