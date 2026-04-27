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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { maskCPF, maskCNPJ, maskPhone, maskCEP, maskDate, unmask } from '@/lib/masks';
import { fetchCepInfo, fetchCnpjInfo } from '@/lib/brasil-api';
import { Search, UserCheck, X, ArrowRight, Loader2 } from 'lucide-react';

interface CompleteCustomerData {
    id: string;
    name: string;
    type?: 'PF' | 'PJ';
    email?: string;
    phone?: string;
    document?: string;
    address?: string;
    addressNumber?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    stateRegistration?: string;
    birthDate?: string;
    architectId?: string;
}

interface CompleteCustomerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer: CompleteCustomerData | null;
    onCompleted?: () => void;
    /** If true, shows a "Skip" option — for non-critical flows */
    allowSkip?: boolean;
}

const ESTADOS_BR = [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
    'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
    'SP','SE','TO',
];

export function CompleteCustomerDialog({
    open,
    onOpenChange,
    customer,
    onCompleted,
    allowSkip = true,
}: CompleteCustomerDialogProps) {
    const [formData, setFormData] = useState<CompleteCustomerData>({
        id: '',
        name: '',
        type: 'PF',
        email: '',
        phone: '',
        document: '',
        address: '',
        addressNumber: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: '',
        birthDate: '',
        architectId: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingCep, setIsLoadingCep] = useState(false);
    const [isLoadingCnpj, setIsLoadingCnpj] = useState(false);
    const [error, setError] = useState('');

    // Populate form with existing customer data when dialog opens
    useEffect(() => {
        if (customer) {
            setFormData({
                id: customer.id,
                name: customer.name || '',
                type: customer.type || 'PF',
                email: customer.email || '',
                phone: customer.phone || '',
                document: customer.document || '',
                address: customer.address || '',
                addressNumber: customer.addressNumber || '',
                complement: customer.complement || '',
                neighborhood: customer.neighborhood || '',
                city: customer.city || '',
                state: customer.state || '',
                zipCode: customer.zipCode || '',
                stateRegistration: customer.stateRegistration || '',
                birthDate: customer.birthDate ? new Date(customer.birthDate).toLocaleDateString('pt-BR') : '',
                architectId: customer.architectId || '',
            });
            setError('');
        }
    }, [customer]);

    const set = (field: keyof CompleteCustomerData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Re-apply mask when type changes
    useEffect(() => {
        if (formData.document) {
            const masked = formData.type === 'PJ' 
                ? maskCNPJ(formData.document) 
                : maskCPF(formData.document);
            if (masked !== formData.document) {
                set('document', masked);
            }
        }
    }, [formData.type]);

    const handleCepLookup = async (cep: string) => {
        const cleaned = unmask(cep);
        if (cleaned.length !== 8) return;

        setIsLoadingCep(true);
        try {
            const data = await fetchCepInfo(cleaned);
            if (data) {
                setFormData(prev => ({
                    ...prev,
                    address: data.street || prev.address,
                    neighborhood: data.neighborhood || prev.neighborhood,
                    city: data.city || prev.city,
                    state: data.state || prev.state,
                }));
            }
        } finally {
            setIsLoadingCep(false);
        }
    };

    const handleCnpjLookup = async (cnpj: string) => {
        const cleaned = unmask(cnpj);
        if (cleaned.length !== 14) return;

        setIsLoadingCnpj(true);
        try {
            const data = await fetchCnpjInfo(cleaned);
            if (data) {
                setFormData(prev => ({
                    ...prev,
                    name: data.razao_social || prev.name,
                    email: data.email || prev.email,
                    phone: data.ddd_telefone_1 ? maskPhone(data.ddd_telefone_1) : prev.phone,
                    zipCode: data.cep ? maskCEP(data.cep) : prev.zipCode,
                    address: data.logradouro || prev.address,
                    neighborhood: data.bairro || prev.neighborhood,
                    city: data.municipio || prev.city,
                    state: data.uf || prev.state,
                }));
            }
        } finally {
            setIsLoadingCnpj(false);
        }
    };

    const [architects, setArchitects] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        const fetchArchitects = async () => {
            try {
                const response = await api.get('/architects');
                setArchitects(response.data);
            } catch (err) {
                console.error('Error fetching architects:', err);
            }
        };
        fetchArchitects();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await api.patch(`/customers/${formData.id}`, {
                name: formData.name,
                type: formData.type,
                email: formData.email || undefined,
                phone: formData.phone ? unmask(formData.phone) : undefined,
                document: formData.document ? unmask(formData.document) : undefined,
                address: formData.address || undefined,
                addressNumber: formData.addressNumber || undefined,
                complement: formData.complement || undefined,
                neighborhood: formData.neighborhood || undefined,
                city: formData.city || undefined,
                state: formData.state || undefined,
                zipCode: formData.zipCode ? unmask(formData.zipCode) : undefined,
                stateRegistration: formData.stateRegistration || undefined,
                birthDate: formData.birthDate ? new Date(formData.birthDate.split('/').reverse().join('-')).toISOString() : undefined,
                architectId: formData.architectId && formData.architectId !== 'none' ? formData.architectId : undefined,
            });

            onCompleted?.();
            onOpenChange(false);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Erro ao atualizar cliente.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
                            <UserCheck className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <DialogTitle>Completar Dados do Cliente</DialogTitle>
                            <DialogDescription>
                                O orçamento foi aprovado! Aproveite para completar o cadastro de{' '}
                                <strong>{customer?.name}</strong>.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 mt-2">
                    {/* Basic Info */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                            Informações Básicas
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="cc-name">Nome</Label>
                                <Input
                                    id="cc-name"
                                    value={formData.name}
                                    onChange={e => set('name', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="cc-type">Tipo</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={v => set('type', v as 'PF' | 'PJ')}
                                >
                                    <SelectTrigger id="cc-type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PF">Pessoa Física (PF)</SelectItem>
                                        <SelectItem value="PJ">Pessoa Jurídica (PJ)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="cc-email">Email</Label>
                                <Input
                                    id="cc-email"
                                    type="email"
                                    value={formData.email}
                                    onChange={e => set('email', e.target.value)}
                                    placeholder="exemplo@email.com"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="cc-phone">Telefone</Label>
                                <Input
                                    id="cc-phone"
                                    value={formData.phone}
                                    onChange={e => set('phone', maskPhone(e.target.value))}
                                    placeholder="(99) 99999-9999"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="cc-document">
                                    {formData.type === 'PF' ? 'CPF' : 'CNPJ'}
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="cc-document"
                                        value={formData.document}
                                        onChange={e => {
                                            const masked = formData.type === 'PJ' 
                                                ? maskCNPJ(e.target.value) 
                                                : maskCPF(e.target.value);
                                            set('document', masked);
                                        }}
                                        placeholder={formData.type === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                                        className="pr-10"
                                    />
                                    {formData.type === 'PJ' && (
                                        <button 
                                            type="button"
                                            onClick={() => handleCnpjLookup(formData.document || '')}
                                            disabled={isLoadingCnpj || (formData.document || '').replace(/\D/g, '').length !== 14}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-primary transition-colors disabled:opacity-50"
                                            title="Buscar CNPJ"
                                        >
                                            {isLoadingCnpj ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                        </button>
                                    )}
                                </div>
                            </div>
                            {formData.type === 'PF' && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="cc-birth">Data de Nascimento</Label>
                                    <Input
                                        id="cc-birth"
                                        value={formData.birthDate || ''}
                                        onChange={e => set('birthDate', maskDate(e.target.value))}
                                        placeholder="DD/MM/AAAA"
                                        maxLength={10}
                                    />
                                </div>
                            )}
                            {formData.type === 'PJ' && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="cc-ie">Inscrição Estadual</Label>
                                    <Input
                                        id="cc-ie"
                                        value={formData.stateRegistration}
                                        onChange={e => set('stateRegistration', e.target.value)}
                                        placeholder="ISENTO ou número"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-3 border-t pt-4">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                            Endereço
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="cc-cep">CEP</Label>
                                <div className="relative">
                                    <Input
                                        id="cc-cep"
                                        value={formData.zipCode}
                                        onChange={e => {
                                            const masked = maskCEP(e.target.value);
                                            set('zipCode', masked);
                                            if (unmask(masked).length === 8) handleCepLookup(masked);
                                        }}
                                        placeholder="00000-000"
                                        className="pr-10"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => handleCepLookup(formData.zipCode || '')}
                                        disabled={isLoadingCep || (formData.zipCode || '').replace(/\D/g, '').length !== 8}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-primary transition-colors disabled:opacity-50"
                                        title="Buscar CEP"
                                    >
                                        {isLoadingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="sm:col-span-2 space-y-1.5">
                                <Label htmlFor="cc-address">Rua / Logradouro</Label>
                                <Input
                                    id="cc-address"
                                    value={formData.address}
                                    onChange={e => set('address', e.target.value)}
                                    placeholder="Rua das Flores"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="cc-number">Número</Label>
                                <Input
                                    id="cc-number"
                                    value={formData.addressNumber}
                                    onChange={e => set('addressNumber', e.target.value)}
                                    placeholder="123"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="cc-complement">Complemento</Label>
                                <Input
                                    id="cc-complement"
                                    value={formData.complement}
                                    onChange={e => set('complement', e.target.value)}
                                    placeholder="Apto 4B"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="cc-neighborhood">Bairro</Label>
                                <Input
                                    id="cc-neighborhood"
                                    value={formData.neighborhood}
                                    onChange={e => set('neighborhood', e.target.value)}
                                />
                            </div>
                            <div className="sm:col-span-2 space-y-1.5">
                                <Label htmlFor="cc-city">Cidade</Label>
                                <Input
                                    id="cc-city"
                                    value={formData.city}
                                    onChange={e => set('city', e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="cc-state">Estado</Label>
                                <Select
                                    value={formData.state}
                                    onValueChange={v => set('state', v)}
                                >
                                    <SelectTrigger id="cc-state">
                                        <SelectValue placeholder="UF" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ESTADOS_BR.map(uf => (
                                            <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="cc-architect">Arquiteto Vinculado</Label>
                                <Select
                                    value={formData.architectId || 'none'}
                                    onValueChange={v => set('architectId', v)}
                                >
                                    <SelectTrigger id="cc-architect">
                                        <SelectValue placeholder="Selecione (opcional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Nenhum</SelectItem>
                                        {architects.map(arch => (
                                            <SelectItem key={arch.id} value={arch.id}>
                                                {arch.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 rounded-md bg-red-50 px-3 py-2">
                            {error}
                        </p>
                    )}

                    <div className="flex justify-between items-center border-t pt-4">
                        {allowSkip ? (
                            <Button
                                type="button"
                                variant="ghost"
                                className="text-gray-500"
                                onClick={() => onOpenChange(false)}
                            >
                                <X className="mr-1 h-4 w-4" />
                                Pular por agora
                            </Button>
                        ) : (
                            <div />
                        )}
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <ArrowRight className="mr-2 h-4 w-4" />
                                    Salvar e Continuar
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
