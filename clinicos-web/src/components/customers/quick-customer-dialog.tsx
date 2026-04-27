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
import { UserPlus, Loader2 } from 'lucide-react';
import { maskPhone, maskCPF, maskCNPJ, unmask } from '@/lib/masks';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface QuickCustomer {
    id: string;
    name: string;
    type: 'PF' | 'PJ';
    phone?: string;
    email?: string;
}

interface QuickCustomerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (customer: QuickCustomer) => void;
}

export function QuickCustomerDialog({
    open,
    onOpenChange,
    onCreated,
}: QuickCustomerDialogProps) {
    const [name, setName] = useState('');
    const [type, setType] = useState<'PF' | 'PJ'>('PF');
    const [document, setDocument] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('O nome do cliente é obrigatório.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const res = await api.post('/customers', {
                name: name.trim(),
                type,
                document: document ? unmask(document) : undefined,
                phone: phone ? unmask(phone) : undefined,
                email: email.trim() || undefined,
            });

            onCreated(res.data);
            // Reset form
            setName('');
            setType('PF');
            setDocument('');
            setPhone('');
            setEmail('');
            onOpenChange(false);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Erro ao criar cliente. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenChange = (val: boolean) => {
        if (!val) {
            setName('');
            setType('PF');
            setDocument('');
            setPhone('');
            setEmail('');
            setError('');
        }
        onOpenChange(val);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">
                            <UserPlus className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <DialogTitle>Novo Cliente Rápido</DialogTitle>
                            <DialogDescription>
                                Preencha apenas o necessário. Os demais dados podem ser completados depois.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div className="space-y-2">
                        <Label htmlFor="qc-name">
                            Nome <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="qc-name"
                            placeholder="Ex: João Silva"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="space-y-3">
                        <Label>Tipo de Cliente</Label>
                        <RadioGroup 
                            value={type} 
                            onValueChange={(val: 'PF' | 'PJ') => {
                                setType(val);
                                setDocument('');
                            }}
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="PF" id="qc-pf" />
                                <Label htmlFor="qc-pf" className="font-normal">Pessoa Física</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="PJ" id="qc-pj" />
                                <Label htmlFor="qc-pj" className="font-normal">Pessoa Jurídica</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="qc-document">
                            {type === 'PF' ? 'CPF' : 'CNPJ'}
                        </Label>
                        <Input
                            id="qc-document"
                            placeholder={type === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                            value={document}
                            onChange={(e) => setDocument(type === 'PF' ? maskCPF(e.target.value) : maskCNPJ(e.target.value))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="qc-phone">Telefone</Label>
                        <Input
                            id="qc-phone"
                            placeholder="(99) 99999-9999"
                            value={phone}
                            onChange={(e) => setPhone(maskPhone(e.target.value))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="qc-email">Email</Label>
                        <Input
                            id="qc-email"
                            type="email"
                            placeholder="joao@email.com"
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
                        💡 Após confirmar o orçamento, você poderá completar os dados completos do cliente.
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
                        <Button type="submit" disabled={isLoading || !name.trim()}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Criando...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Criar Cliente
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
