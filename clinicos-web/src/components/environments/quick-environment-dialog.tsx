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
import { Home, Loader2 } from 'lucide-react';

interface QuickEnvironment {
    id: string;
    name: string;
}

interface QuickEnvironmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (environment: QuickEnvironment) => void;
}

export function QuickEnvironmentDialog({
    open,
    onOpenChange,
    onCreated,
}: QuickEnvironmentDialogProps) {
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('O nome do ambiente é obrigatório.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const res = await api.post('/environments', {
                name: name.trim(),
            });

            onCreated(res.data);
            resetForm();
            onOpenChange(false);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Erro ao criar ambiente. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setName('');
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
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
                            <Home className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <DialogTitle>Novo Ambiente Rápido</DialogTitle>
                            <DialogDescription>
                                Crie um novo ambiente para utilizar neste orçamento.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="quick-env-name">Nome do Ambiente *</Label>
                        <Input
                            id="quick-env-name"
                            placeholder="Ex: Sala de Estar, Banheiro Social..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isLoading}
                            autoFocus
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                'Criar Ambiente'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
