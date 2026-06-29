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
    defaultCfop: string | null;
    defaultCst: string | null;
    defaultOrigin: number;
    // New fields for NexosFiscal setup
    document?: string;
    name?: string;
    certificate?: FileList;
    password?: string;
}

interface FiscalSettingsFormProps {
    clinicId?: string;
}

export function FiscalSettingsForm({ clinicId }: FiscalSettingsFormProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingSetup, setIsSavingSetup] = useState(false);
    const [settings, setSettings] = useState<FiscalSettings | null>(null);

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FiscalSettings>();

    useEffect(() => {
        loadSettings();
    }, [clinicId]);

    async function loadSettings() {
        setIsLoading(true);
        try {
            const response = await api.get('/fiscal/settings', {
                params: { clinicId },
                headers: clinicId ? { 'X-Clinic-Id': clinicId } : {}
            });
            const data = response.data;
            setSettings(data);

            // Populate form
            setValue('defaultNaturezaOperacao', data.defaultNaturezaOperacao);
            setValue('defaultTaxClass', data.defaultTaxClass || '');
            setValue('defaultNcm', data.defaultNcm || '');
            setValue('defaultCest', data.defaultCest || '');
            setValue('defaultCfop', data.defaultCfop || '');
            setValue('defaultCst', data.defaultCst || '');
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
                params: { clinicId },
                headers: clinicId ? { 'X-Clinic-Id': clinicId } : {}
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

    async function onSubmitSetup(data: FiscalSettings) {
        if (!data.certificate || data.certificate.length === 0) {
            toast.error('O arquivo do certificado (.pfx) é obrigatório.');
            return;
        }

        if (!data.document || !data.name || !data.password) {
            toast.error('Preencha todos os campos do setup.');
            return;
        }

        setIsSavingSetup(true);
        try {
            const formData = new FormData();
            formData.append('document', data.document);
            formData.append('name', data.name);
            formData.append('password', data.password);
            formData.append('certificate', data.certificate[0]);

            await api.post('/fiscal/setup', formData, {
                params: { clinicId },
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    ...(clinicId ? { 'X-Clinic-Id': clinicId } : {})
                }
            });
            
            toast.success('Certificado e Tenant configurados com sucesso!');
            loadSettings(); // Reload to confirm state
        } catch (error) {
            console.error('Erro ao configurar NexosFiscal:', error);
            toast.error('Erro ao configurar o certificado.');
        } finally {
            setIsSavingSetup(false);
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
                        Estado atual das credenciais da API NexosFiscal.
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

            {/* Setup Form */}
            <form onSubmit={handleSubmit(onSubmitSetup)}>
                <Card className="mb-6 border-blue-200">
                    <CardHeader className="bg-blue-50/50">
                        <CardTitle>Setup Inicial (NexosFiscal)</CardTitle>
                        <CardDescription>
                            Configure o certificado digital A1 para habilitar a emissão de notas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>CNPJ da Loja</Label>
                                <Input {...register('document', { required: true })} placeholder="Ex: 00.000.000/0000-00" />
                            </div>
                            <div className="space-y-2">
                                <Label>Razão Social</Label>
                                <Input {...register('name', { required: true })} placeholder="Ex: Loja de Revestimentos LTDA" />
                            </div>
                            <div className="space-y-2">
                                <Label>Certificado Digital A1 (.pfx)</Label>
                                <Input type="file" accept=".pfx,.p12" {...register('certificate', { required: true })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Senha do Certificado</Label>
                                <Input type="password" {...register('password', { required: true })} placeholder="Senha do arquivo .pfx" />
                            </div>
                        </div>
                        <div className="flex justify-end mt-4">
                            <Button type="submit" disabled={isSavingSetup} className="bg-blue-600 hover:bg-blue-700">
                                {isSavingSetup ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Configurando...
                                    </>
                                ) : (
                                    'Configurar Certificado'
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>

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
                                <Label>Ambiente NexosFiscal</Label>
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
                                    <div className="flex items-center justify-between">
                                        <Label>ID da Classe de Imposto</Label>
                                        <span className="text-xs text-gray-500">Opcional</span>
                                    </div>
                                    <Input {...register('defaultTaxClass')} placeholder="Ex: classe_01" />
                                    <p className="text-xs text-gray-500">
                                        ID do grupo de impostos caso utilize perfil pré-configurado.
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
                                    <Label>CFOP Padrão (Saída)</Label>
                                    <Input {...register('defaultCfop')} placeholder="Ex: 5102 (Revenda)" />
                                    <p className="text-xs text-gray-500">Usado ao dar entrada em notas de compra para evitar conflito com o CFOP do fornecedor.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>CST Padrão</Label>
                                    <Input {...register('defaultCst')} placeholder="Ex: 00" />
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
