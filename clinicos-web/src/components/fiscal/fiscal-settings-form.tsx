'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface FiscalSettings {
    hasCredentials: boolean;
    source: 'env' | 'database';
    environment: '1' | '2';
    defaultNaturezaOperacao: string;
    defaultTaxClass: string | null;
    defaultNcm: string | null;
    defaultCest: string | null;
    defaultOrigin: number;
}

interface FiscalSettingsFormProps {
    clinicId?: string;
}

export function FiscalSettingsForm({ clinicId }: FiscalSettingsFormProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState<FiscalSettings | null>(null);

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FiscalSettings>();

    useEffect(() => {
        loadSettings();
    }, [clinicId]);

    async function loadSettings() {
        setIsLoading(true);
        try {
            const response = await api.get('/fiscal/settings', {
                params: { clinicId }
            });
            const data = response.data;
            setSettings(data);

            // Populate form
            setValue('defaultNaturezaOperacao', data.defaultNaturezaOperacao);
            setValue('defaultTaxClass', data.defaultTaxClass || '');
            setValue('defaultNcm', data.defaultNcm || '');
            setValue('defaultCest', data.defaultCest || '');
            setValue('defaultOrigin', data.defaultOrigin);
            setValue('environment', data.environment);

            setIsLoading(false);
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            // Only show toast if it's not a 404/403 expected error during switching
            toast.error('Erro ao carregar configurações fiscais.');
            setIsLoading(false);
        }
    }

    async function onSubmit(data: FiscalSettings) {
        setIsSaving(true);
        try {
            await api.put('/fiscal/settings', {
                ...data,
                defaultOrigin: Number(data.defaultOrigin) // Ensure number
            }, {
                params: { clinicId }
            });
            toast.success('Configurações salvas com sucesso!');
            loadSettings(); // Reload to confirm state
        } catch (error) {
            console.error('Erro ao salvar settings:', error);
            toast.error('Erro ao salvar as configurações.');
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Connection Status Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        Status da Conexão
                        {settings?.hasCredentials ? (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Conectado
                            </Badge>
                        ) : (
                            <Badge variant="destructive">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Não Configurado
                            </Badge>
                        )}
                    </CardTitle>
                    <CardDescription>
                        Estado atual das credenciais da API Webmania.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                        <div className="space-y-1">
                            <p className="font-medium text-sm">Fonte das Credenciais</p>
                            <p className="text-sm text-gray-500">
                                {settings?.source === 'env'
                                    ? 'Variáveis de Ambiente (Docker/Sistema)'
                                    : 'Banco de Dados (Configuração Específica)'}
                            </p>
                        </div>
                        <div className="text-right">
                            {settings?.hasCredentials ? (
                                <span className="text-sm text-green-600 font-medium">Operacional</span>
                            ) : (
                                <span className="text-sm text-red-600 font-medium">Credenciais Ausentes</span>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Rules Form */}
            <form onSubmit={handleSubmit(onSubmit)}>
                <Card>
                    <CardHeader>
                        <CardTitle>Regras de Emissão</CardTitle>
                        <CardDescription>
                            Defina os padrões fiscais que serão utilizados quando o produto não tiver configuração específica.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Ambiente Webmania</Label>
                                <Select
                                    defaultValue={settings?.environment}
                                    onValueChange={(val) => setValue('environment', val as '1' | '2')}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o ambiente" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="2">Homologação (Testes)</SelectItem>
                                        <SelectItem value="1">Produção</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-500">Homologação emite notas sem valor fiscal.</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Natureza da Operação (Padrão)</Label>
                                <Input {...register('defaultNaturezaOperacao')} placeholder="Ex: Venda de mercadoria" />
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <h3 className="text-sm font-medium mb-4 text-gray-900">Tributação e Classificação</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>ID da Classe de Imposto (Webmania)</Label>
                                    <Input {...register('defaultTaxClass')} placeholder="Ex: 102" />
                                    <p className="text-xs text-gray-500">
                                        ID do grupo de impostos configurado no painel da Webmania (ex: Simples Nacional).
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>NCM Padrão</Label>
                                    <Input {...register('defaultNcm')} placeholder="0000.00.00" />
                                </div>

                                <div className="space-y-2">
                                    <Label>Cest Padrão</Label>
                                    <Input {...register('defaultCest')} placeholder="" />
                                </div>

                                <div className="space-y-2">
                                    <Label>Origem dos Produtos</Label>
                                    <Select
                                        defaultValue={settings?.defaultOrigin?.toString()}
                                        onValueChange={(val) => setValue('defaultOrigin', Number(val))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione a origem" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">0 - Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8</SelectItem>
                                            <SelectItem value="1">1 - Estrangeira - Importação direta</SelectItem>
                                            <SelectItem value="2">2 - Estrangeira - Adquirida no mercado interno</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                    </CardContent>
                </Card>

                <div className="flex justify-end mt-6">
                    <Button type="submit" disabled={isSaving || !settings?.hasCredentials}>
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            'Salvar Configurações'
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
