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

interface Props {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreatePatientDialog({ open, onClose, onSuccess }: Props) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        document: '',
        notes: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await api.post('/patients', formData);
            onSuccess();
            // Reset form
            setFormData({
                name: '',
                email: '',
                phone: '',
                document: '',
                notes: '',
            });
        } catch (err: any) {
            console.error('Error creating patient:', err);
            setError(err.response?.data?.message || 'Erro ao criar paciente');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Novo Paciente</DialogTitle>
                    <DialogDescription>
                        Preencha os dados para cadastrar um novo paciente
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Nome do paciente"
                            required
                            minLength={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email (opcional)</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="email@exemplo.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Telefone (opcional)</Label>
                        <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="(11) 98765-4321"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="document">Documento - CPF/NIF (opcional)</Label>
                        <Input
                            id="document"
                            value={formData.document}
                            onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                            placeholder="000.000.000-00"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Observações (opcional)</Label>
                        <Input
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Informações adicionais"
                        />
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Criando...' : 'Criar Paciente'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
