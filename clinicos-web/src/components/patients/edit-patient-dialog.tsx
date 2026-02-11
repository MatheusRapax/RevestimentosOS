'use client';

import { useState, useEffect } from 'react';
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

interface Patient {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    document?: string;
    notes?: string;
    isActive: boolean;
}

interface Props {
    open: boolean;
    patient: Patient | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditPatientDialog({ open, patient, onClose, onSuccess }: Props) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        document: '',
        notes: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Populate form when patient changes
    useEffect(() => {
        if (patient) {
            setFormData({
                name: patient.name,
                email: patient.email || '',
                phone: patient.phone || '',
                document: patient.document || '',
                notes: patient.notes || '',
            });
        }
    }, [patient]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patient) return;

        setError('');
        setIsLoading(true);

        try {
            await api.patch(`/patients/${patient.id}`, formData);
            onSuccess();
        } catch (err: any) {
            console.error('Error updating patient:', err);
            setError(err.response?.data?.message || 'Erro ao atualizar cliente');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Editar Cliente</DialogTitle>
                    <DialogDescription>
                        Atualize os dados do cliente
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="edit-name">Nome Completo *</Label>
                        <Input
                            id="edit-name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Nome do paciente"
                            required
                            minLength={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-email">Email (opcional)</Label>
                        <Input
                            id="edit-email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="email@exemplo.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-phone">Telefone (opcional)</Label>
                        <Input
                            id="edit-phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="(11) 98765-4321"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-document">Documento - CPF/NIF (opcional)</Label>
                        <Input
                            id="edit-document"
                            value={formData.document}
                            onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                            placeholder="000.000.000-00"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-notes">Observações (opcional)</Label>
                        <Input
                            id="edit-notes"
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
                            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
