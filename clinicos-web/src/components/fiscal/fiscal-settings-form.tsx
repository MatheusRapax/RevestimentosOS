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
import { Loader2, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { fetchCnpjInfo } from '@/lib/brasil-api';

interface FiscalSettings {
    hasCredentials: boolean;
    source: 'env' | 'database';
    productionAllowed?: boolean;
    hasCertificate?: boolean;
    certificateFileName?: string | null;
    certificateUploadedAt?: string | null;
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
    ie?: string;
    uf?: string;
    cityCode?: string;
    crt?: string;
}

interface FiscalSettingsFormProps {
    clinicId?: string;
}

const EMPTY_PROFILE = {
    cnpj: '', ie: '', im: '', crt: '', cnae: '',
    logradouro: '', numero: '', complemento: '', bairro: '',
    municipioIbge: '', municipioNome: '', uf: '', cep: '',
    serieNfe: '1',
};

export function FiscalSettingsForm({ clinicId }: FiscalSettingsFormProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingSetup, setIsSavingSetup] = useState(false);
    const [settings, setSettings] = useState<FiscalSettings | null>(null);

    const [profile, setProfile] = useState<Record<string, string>>({ ...EMPTY_PROFILE });
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isLoadingCnpj, setIsLoadingCnpj] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoadingSefaz, setIsLoadingSefaz] = useState(false);
    const [sefaz, setSefaz] = useState<any>(null);
    // Último perfil gravado no servidor: o Setup só vale para o que já foi salvo.
    const [savedProfile, setSavedProfile] = useState<Record<string, string>>({ ...EMPTY_PROFILE });

    // Duas instâncias separadas: "Setup" e "Regras" são <form>s independentes.
    // Um único useForm() compartilhado fazia os campos obrigatórios do Setup
    // (certificado, senha, razão social) bloquearem silenciosamente o submit
    // das Regras sempre que o certificado ainda não tivesse sido enviado —
    // handleSubmit valida TODOS os campos registrados no hook, não só os do
    // <form> que disparou o submit, e sem errorHandler o formSetup inválido
    // simplesmente não chamava onSubmit (sem toast, sem request, nada).
    const {
        register: registerRules,
        handleSubmit: handleSubmitRules,
        setValue,
        watch,
    } = useForm<FiscalSettings>();
    const {
        register: registerSetup,
        handleSubmit: handleSubmitSetup,
        setValue: setSetupValue,
        reset: resetSetup,
    } = useForm<FiscalSettings>();

    async function loadProfile() {
        try {
            const resp = await api.get('/fiscal/profile', {
                params: { clinicId },
                headers: clinicId ? { 'X-Clinic-Id': clinicId } : {},
            });
            if (resp.data) {
                // Só os campos editáveis do perfil entram no estado — o GET também
                // devolve id/clinicId/createdAt/updatedAt, e se esses forem
                // reenviados no PUT o DTO (forbidNonWhitelisted) rejeita com
                // "property id should not exist".
                const editableKeys = Object.keys(EMPTY_PROFILE);
                const loaded = {
                    ...EMPTY_PROFILE,
                    ...Object.fromEntries(
                        Object.entries(resp.data)
                            .filter(([k]) => editableKeys.includes(k))
                            .map(([k, v]) => [k, v == null ? '' : String(v)]),
                    ),
                };
                setProfile(loaded);
                setSavedProfile(loaded);
            } else {
                setProfile({ ...EMPTY_PROFILE });
                setSavedProfile({ ...EMPTY_PROFILE });
            }
        } catch {
            setProfile({ ...EMPTY_PROFILE });
            setSavedProfile({ ...EMPTY_PROFILE });
        }
    }

    // Reflete o Perfil do Emitente (já salvo) no cadastro do serviço fiscal. Não mexe no ambiente.
    async function syncTenant() {
        setIsSyncing(true);
        try {
            const resp = await api.post('/fiscal/sync-tenant', {}, {
                params: { clinicId },
                headers: clinicId ? { 'X-Clinic-Id': clinicId } : {},
            });
            toast.success('Cadastro do emitente sincronizado com o serviço fiscal.');
            (resp.data?.avisos as string[] | undefined)?.forEach((a) => toast.warning(a));
            loadSefazStatus();
        } catch (e: any) {
            const m = e.response?.data?.message;
            toast.error(Array.isArray(m) ? m.join(' ') : m || 'Erro ao sincronizar com o serviço fiscal.', { duration: 12000 });
        } finally {
            setIsSyncing(false);
        }
    }

    // Conferência do certificado e da SEFAZ (não emite nada).
    async function loadSefazStatus() {
        setIsLoadingSefaz(true);
        try {
            const resp = await api.get('/fiscal/status', {
                params: { clinicId },
                headers: clinicId ? { 'X-Clinic-Id': clinicId } : {},
            });
            setSefaz(resp.data);
        } catch {
            setSefaz({ available: false, alertas: [{ nivel: 'erro', mensagem: 'Não foi possível consultar o status do certificado.' }] });
        } finally {
            setIsLoadingSefaz(false);
        }
    }

    // Preenche o Perfil do Emitente a partir do CNPJ (BrasilAPI/Receita). Não vêm da
    // consulta: Inscrição Estadual e Municipal e a série da NF-e. O regime (CRT) é só
    // uma sugestão (Simples/MEI → 1, senão 3) — o contador confirma.
    async function fillProfileFromCnpj() {
        const cnpj = (profile.cnpj || '').replace(/\D/g, '');
        if (cnpj.length !== 14) {
            toast.error('Digite os 14 dígitos do CNPJ para buscar.');
            return;
        }
        setIsLoadingCnpj(true);
        try {
            const data = await fetchCnpjInfo(cnpj);
            if (!data) {
                toast.error('CNPJ não encontrado na consulta pública. Confira os dígitos ou preencha manualmente.');
                return;
            }
            const ibge = data.codigo_municipio_ibge ? String(data.codigo_municipio_ibge) : '';
            setProfile((prev) => ({
                ...prev,
                logradouro: data.logradouro || prev.logradouro,
                numero: data.numero || prev.numero,
                complemento: data.complemento || prev.complemento,
                bairro: data.bairro || prev.bairro,
                cep: data.cep ? String(data.cep).replace(/\D/g, '') : prev.cep,
                municipioNome: data.municipio || prev.municipioNome,
                municipioIbge: ibge || prev.municipioIbge,
                uf: data.uf || prev.uf,
                cnae: data.cnae_fiscal ? String(data.cnae_fiscal) : prev.cnae,
                crt: data.opcao_pelo_simples || data.opcao_pelo_mei ? '1' : '3',
            }));
            if (data.razao_social) setSetupValue('name', data.razao_social);
            toast.success('Dados preenchidos pelo CNPJ. Informe a Inscrição Estadual, confira o regime tributário e clique em Salvar Perfil.');
        } finally {
            setIsLoadingCnpj(false);
        }
    }

    async function saveProfile() {
        setIsSavingProfile(true);
        try {
            const body: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(profile)) {
                if (v === '' || v == null) continue;
                if (k === 'crt' || k === 'serieNfe' || k === 'serieNfce') body[k] = Number(v);
                else body[k] = v;
            }
            const resp = await api.put('/fiscal/profile', body, {
                params: { clinicId },
                headers: clinicId ? { 'X-Clinic-Id': clinicId } : {},
            });
            const sync = resp.data?.sync;
            if (sync?.ok) {
                toast.success('Perfil salvo e sincronizado com o serviço fiscal.');
                (sync.avisos as string[] | undefined)?.forEach((a) => toast.warning(a));
                loadSefazStatus();
            } else if (sync && !sync.skipped) {
                toast.warning(`Perfil salvo, mas NÃO sincronizado com o serviço fiscal: ${sync.message}`, { duration: 12000 });
            } else {
                toast.success('Perfil do emitente salvo.');
            }
            loadProfile();
        } catch (e: any) {
            toast.error(e.response?.data?.message?.[0] || e.response?.data?.message || 'Erro ao salvar o perfil do emitente.');
        } finally {
            setIsSavingProfile(false);
        }
    }

    useEffect(() => {
        loadProfile();
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
            // Só consulta o serviço fiscal se já existe certificado instalado (leitura, não emite nada)
            if (data.hasCertificate) loadSefazStatus();

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

        if (!data.name || !data.password) {
            toast.error('Informe a Razão Social e a senha do certificado.');
            return;
        }

        // O Perfil do Emitente é a fonte da verdade e precisa estar SALVO: o servidor lê o
        // perfil gravado, não o que está digitado na tela.
        if (JSON.stringify(profile) !== JSON.stringify(savedProfile)) {
            toast.error('Há alterações não salvas no Perfil do Emitente. Clique em "Salvar Perfil" antes de enviar o certificado.');
            return;
        }
        if (!savedProfile.cnpj || !savedProfile.uf || !savedProfile.municipioIbge || !savedProfile.crt) {
            toast.error('Complete o Perfil do Emitente (CNPJ, UF, código IBGE e regime tributário) e salve antes de enviar o certificado.');
            return;
        }

        setIsSavingSetup(true);
        try {
            const formData = new FormData();
            // Identidade do emitente (CNPJ, IE, regime, UF, município, endereço) vem SEMPRE do
            // Perfil salvo; aqui só vai o que é do certificado. Se o CNPJ digitado no Setup
            // divergir do perfil, o servidor recusa com a explicação.
            if (data.document) formData.append('document', data.document);
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
            
            toast.success('Certificado instalado com sucesso! Veja o status no topo da página.');
            resetSetup(); // limpa arquivo e senha: o status acima passa a mostrar o certificado instalado
            loadSettings(); // Reload to confirm state
            loadSefazStatus(); // confere CNPJ do certificado x tenant, validade e SEFAZ (não emite nada)
        } catch (error: any) {
            console.error('Erro ao configurar NexosFiscal:', error);
            const msg = error?.response?.data?.message;
            toast.error(
                `Não foi possível instalar o certificado.${msg ? ` ${Array.isArray(msg) ? msg.join(' ') : msg}` : ''}`,
            );
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
                        {settings?.hasCertificate ? (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Certificado instalado
                            </Badge>
                        ) : (
                            <Badge variant="destructive">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Certificado não instalado
                            </Badge>
                        )}
                    </CardTitle>
                    <CardDescription>
                        Estado do certificado digital desta loja e da conexão com o NexosFiscal.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {settings?.environment === '1' ? (
                        <div className="p-4 rounded-lg border border-red-300 bg-red-50 text-sm text-red-800">
                            <strong>Ambiente salvo: PRODUÇÃO.</strong> Notas emitidas em produção têm valor fiscal.
                            {settings.productionAllowed
                                ? ' Confirme que é isso mesmo que você quer.'
                                : ' Este servidor está com a emissão em produção BLOQUEADA — nenhuma nota será emitida até você voltar para Homologação.'}
                        </div>
                    ) : (
                        <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-sm text-amber-900">
                            <strong>Ambiente: HOMOLOGAÇÃO.</strong> As notas emitidas são de teste e não têm valor fiscal.
                        </div>
                    )}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                        <div className="space-y-1">
                            <p className="font-medium text-sm">Certificado Digital A1</p>
                            <p className="text-sm text-gray-500">
                                {settings?.hasCertificate
                                    ? settings.certificateUploadedAt
                                        ? `Enviado em ${new Date(settings.certificateUploadedAt).toLocaleString('pt-BR')}${settings.certificateFileName ? ` — arquivo ${settings.certificateFileName}` : ''}`
                                        : 'Instalado (data do envio não registrada)'
                                    : 'Nenhum certificado enviado para esta loja ainda. Use o Setup Inicial abaixo.'}
                            </p>
                        </div>
                        <div className="text-right">
                            {settings?.hasCertificate ? (
                                <span className="text-sm text-green-600 font-medium">Aceito pelo NexosFiscal</span>
                            ) : (
                                <span className="text-sm text-red-600 font-medium">Pendente</span>
                            )}
                        </div>
                    </div>
                    {settings?.hasCertificate && (
                        <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">Conferência do certificado (SEFAZ)</p>
                                    <p className="text-xs text-gray-500">Consulta o status da SEFAZ com o seu certificado. Não emite nenhuma nota.</p>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={loadSefazStatus} disabled={isLoadingSefaz}>
                                    {isLoadingSefaz ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verificar certificado'}
                                </Button>
                            </div>
                            {sefaz?.certificado && (
                                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                                    <div><dt className="inline text-gray-500">CNPJ do certificado: </dt><dd className="inline font-medium">{sefaz.certificado.cnpj || '—'}</dd></div>
                                    <div>
                                        <dt className="inline text-gray-500">CNPJ confere com o cadastro fiscal: </dt>
                                        <dd className={`inline font-medium ${sefaz.certificado.cnpjMatchesTenant ? 'text-green-700' : 'text-red-700'}`}>
                                            {sefaz.certificado.cnpjMatchesTenant ? 'Sim' : 'NÃO'}
                                        </dd>
                                    </div>
                                    <div><dt className="inline text-gray-500">Válido até: </dt><dd className="inline font-medium">{sefaz.certificado.notAfterUtc ? new Date(sefaz.certificado.notAfterUtc).toLocaleDateString('pt-BR') : '—'}{sefaz.certificado.expired ? ' (VENCIDO)' : ''}</dd></div>
                                    <div><dt className="inline text-gray-500">Ambiente do cadastro fiscal: </dt><dd className="inline font-medium">{sefaz.ambiente || '—'}</dd></div>
                                    <div className="md:col-span-2"><dt className="inline text-gray-500">SEFAZ: </dt><dd className="inline font-medium">{sefaz.reachable ? `respondeu${sefaz.cStat ? ` (cStat ${sefaz.cStat}${sefaz.motivo ? ` — ${sefaz.motivo}` : ''})` : ''}` : 'sem resposta'}</dd></div>
                                </dl>
                            )}
                            {sefaz?.alertas?.map((a: { nivel: string; mensagem: string }, i: number) => (
                                <p key={i} className={`text-sm rounded border p-2 ${a.nivel === 'erro' ? 'border-red-300 bg-red-50 text-red-800' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
                                    {a.nivel === 'erro' ? '⛔ ' : '⚠️ '}{a.mensagem}
                                </p>
                            ))}
                            {sefaz?.available && sefaz?.alertas?.length === 0 && (
                                <p className="text-sm rounded border border-green-300 bg-green-50 text-green-800 p-2">✅ Certificado confere com o cadastro, está dentro da validade e a SEFAZ respondeu.</p>
                            )}
                        </div>
                    )}
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

            {/* Perfil do Emitente */}
            <Card>
                <CardHeader>
                    <CardTitle>Perfil do Emitente</CardTitle>
                    <CardDescription>
                        Identidade fiscal da loja emissora. É a fonte destes dados para a NF-e —
                        e o padrão usado no setup do NexosFiscal.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>CNPJ <span className="text-xs text-gray-400">(14 dígitos)</span></Label>
                            <div className="flex gap-2">
                                <Input value={profile.cnpj} onChange={(e) => setProfile({ ...profile, cnpj: e.target.value.replace(/\D/g, '') })} maxLength={14} placeholder="00000000000000" />
                                <Button type="button" variant="outline" onClick={fillProfileFromCnpj} disabled={isLoadingCnpj} title="Buscar endereço, município (IBGE), CNAE e razão social pelo CNPJ">
                                    {isLoadingCnpj ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="text-[11px] text-gray-500">Clique na lupa para preencher endereço, código IBGE, CNAE e razão social.</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Inscrição Estadual <span className="text-xs text-gray-400">(não vem da consulta)</span></Label>
                            <Input value={profile.ie} onChange={(e) => setProfile({ ...profile, ie: e.target.value })} placeholder="Número ou ISENTO" />
                            {/^isento$/i.test(profile.ie.trim()) && (
                                <p className="text-[11px] text-amber-700">⚠️ IE &quot;ISENTO&quot; é incomum para quem vende mercadoria (comércio costuma ser contribuinte do ICMS e ter IE). Confirme com o contador e informe a IE real, se houver.</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Inscrição Municipal</Label>
                            <Input value={profile.im} onChange={(e) => setProfile({ ...profile, im: e.target.value })} placeholder="Opcional" />
                        </div>
                        <div className="space-y-2">
                            <Label>Regime Tributário (CRT) <span className="text-xs text-gray-400">(confirme com o contador)</span></Label>
                            <Select value={profile.crt} onValueChange={(v) => setProfile({ ...profile, crt: v })}>
                                <SelectTrigger><SelectValue placeholder="Escolha o regime (obrigatório)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 - Simples Nacional</SelectItem>
                                    <SelectItem value="2">2 - Simples Nacional, excesso de sublimite</SelectItem>
                                    <SelectItem value="3">3 - Regime Normal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>CNAE Principal</Label>
                            <Input value={profile.cnae} onChange={(e) => setProfile({ ...profile, cnae: e.target.value })} placeholder="Opcional" />
                        </div>
                        <div className="space-y-2">
                            <Label>Série NF-e</Label>
                            <Input type="number" min={1} value={profile.serieNfe} onChange={(e) => setProfile({ ...profile, serieNfe: e.target.value })} />
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h3 className="text-sm font-medium mb-4 text-gray-900">Endereço do Emitente</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2 md:col-span-2">
                                <Label>Logradouro</Label>
                                <Input value={profile.logradouro} onChange={(e) => setProfile({ ...profile, logradouro: e.target.value })} />
                                {profile.logradouro.includes('/') && (
                                    <p className="text-[11px] text-amber-700">⚠️ O logradouro tem uma barra (&quot;/&quot;): parece a junção de dois endereços. Confira exatamente como deve sair na NF-e.</p>
                                )}
                                {profile.logradouro.length > 60 && (
                                    <p className="text-[11px] text-red-700">⛔ Passa de 60 caracteres (limite da NF-e). Abrevie.</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Número</Label>
                                <Input value={profile.numero} onChange={(e) => setProfile({ ...profile, numero: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Complemento</Label>
                                <Input value={profile.complemento} onChange={(e) => setProfile({ ...profile, complemento: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Bairro</Label>
                                <Input value={profile.bairro} onChange={(e) => setProfile({ ...profile, bairro: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>CEP <span className="text-xs text-gray-400">(8 dígitos)</span></Label>
                                <Input value={profile.cep} onChange={(e) => setProfile({ ...profile, cep: e.target.value.replace(/\D/g, '') })} maxLength={8} />
                            </div>
                            <div className="space-y-2">
                                <Label>Município</Label>
                                <Input value={profile.municipioNome} onChange={(e) => setProfile({ ...profile, municipioNome: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Código IBGE <span className="text-xs text-gray-400">(7 díg — casa com a UF)</span></Label>
                                <Input value={profile.municipioIbge} onChange={(e) => setProfile({ ...profile, municipioIbge: e.target.value.replace(/\D/g, '') })} maxLength={7} placeholder="Ex: 3550308" />
                            </div>
                            <div className="space-y-2">
                                <Label>UF</Label>
                                <Input value={profile.uf} onChange={(e) => setProfile({ ...profile, uf: e.target.value.toUpperCase().slice(0, 2) })} maxLength={2} placeholder="Ex: SP" />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        {settings?.hasCertificate && (
                            <Button type="button" variant="outline" onClick={syncTenant} disabled={isSyncing || isSavingProfile} title="Reflete o perfil salvo no cadastro do emitente do serviço fiscal (não muda o ambiente)">
                                {isSyncing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sincronizando...</>) : 'Sincronizar com o serviço fiscal'}
                            </Button>
                        )}
                        <Button type="button" onClick={saveProfile} disabled={isSavingProfile}>
                            {isSavingProfile ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>) : 'Salvar Perfil'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Setup Form */}
            <form onSubmit={handleSubmitSetup(onSubmitSetup)}>
                <Card className="mb-6 border-blue-200">
                    <CardHeader className="bg-blue-50/50">
                        <CardTitle>Setup Inicial (NexosFiscal)</CardTitle>
                        <CardDescription>
                            Configure o certificado digital A1 para habilitar a emissão de notas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        {settings?.hasCertificate ? (
                            <p className="text-xs text-green-800 bg-green-50 border border-green-200 rounded p-2">
                                <strong>Já existe um certificado instalado nesta loja.</strong> Não precisa enviar de novo:
                                os campos abaixo ficam vazios de propósito. Só envie outro arquivo para substituir o atual
                                (por exemplo, quando o certificado vencer).
                            </p>
                        ) : (
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                                Preencha o <strong>Perfil do Emitente</strong> acima antes de subir o certificado —
                                CNPJ, UF, município e regime vêm de lá.
                            </p>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>CNPJ da Loja <span className="text-xs text-gray-400">(opcional se no Perfil)</span></Label>
                                <Input {...registerSetup('document')} placeholder="Ex: 00.000.000/0000-00" />
                            </div>
                            <div className="space-y-2">
                                <Label>Razão Social</Label>
                                <Input {...registerSetup('name', { required: true })} placeholder="Ex: Loja de Revestimentos LTDA" />
                            </div>
                            <div className="space-y-2">
                                <Label>Certificado Digital A1 (.pfx)</Label>
                                <Input type="file" accept=".pfx,.p12" {...registerSetup('certificate', { required: true })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Senha do Certificado</Label>
                                <Input type="password" {...registerSetup('password', { required: true })} placeholder="Senha do arquivo .pfx" />
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
                                    settings?.hasCertificate ? 'Substituir Certificado' : 'Configurar Certificado'
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>

            {/* Rules Form */}
            <form onSubmit={handleSubmitRules(onSubmit)}>
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
                                        <SelectItem value="1" disabled={!settings?.productionAllowed}>
                                            Produção{!settings?.productionAllowed ? ' (bloqueada neste servidor)' : ''}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-gray-500">
                                    Homologação emite notas sem valor fiscal.
                                    {!settings?.productionAllowed && ' A emissão em produção está travada por segurança neste servidor.'}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Natureza da Operação (Padrão)</Label>
                                <Input {...registerRules('defaultNaturezaOperacao')} placeholder="Ex: Venda de mercadoria" />
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
                                    <Input {...registerRules('defaultTaxClass')} placeholder="Ex: classe_01" />
                                    <p className="text-xs text-gray-500">
                                        ID do grupo de impostos caso utilize perfil pré-configurado.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label>NCM Padrão</Label>
                                    <Input {...registerRules('defaultNcm')} placeholder="0000.00.00" />
                                </div>

                                <div className="space-y-2">
                                    <Label>Cest Padrão</Label>
                                    <Input {...registerRules('defaultCest')} placeholder="" />
                                </div>

                                <div className="space-y-2">
                                    <Label>CFOP Padrão (Saída)</Label>
                                    <Input {...registerRules('defaultCfop')} placeholder="Ex: 5102 (Revenda)" />
                                    <p className="text-xs text-gray-500">Usado ao dar entrada em notas de compra para evitar conflito com o CFOP do fornecedor.</p>
                                    {(() => {
                                        const currentCfop = watch('defaultCfop');
                                        if (currentCfop && currentCfop.length >= 4 && !['5102', '5405', '6102', '6405'].includes(currentCfop)) {
                                            return (
                                                <div className="flex items-start gap-2 text-yellow-600 bg-yellow-50 p-2 rounded border border-yellow-200 mt-2 text-xs">
                                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                                    <p>Atenção: O CFOP <strong>{currentCfop}</strong> não é um código padrão de revenda (ex: 5102, 5405). Se configurado errado, suas vendas poderão ser rejeitadas pela Sefaz.</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>

                                <div className="space-y-2">
                                    <Label>CST Padrão</Label>
                                    <Input {...registerRules('defaultCst')} placeholder="Ex: 00" />
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
