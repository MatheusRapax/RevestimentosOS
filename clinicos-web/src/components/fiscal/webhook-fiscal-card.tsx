'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';

interface WebhookCadastrado {
    id: string;
    url: string;
    eventType: number | string;
    isActive: boolean;
}

interface EstadoWebhook {
    urlConfigurada: string | null;
    problemaDeConfiguracao: string | null;
    ultimoCadastro: { url: string | null; em: string | null; erro: string | null };
    consultado: boolean;
    ativo: boolean;
    cadastrados: WebhookCadastrado[];
    erroConsulta?: string;
}

/**
 * Cadastro do webhook do ERP no serviço fiscal (A17). Sem ele o serviço não avisa de nota autorizada,
 * recusada, cancelada nem do certificado vencendo; só a reconciliação periódica atualiza as notas.
 */
export function WebhookFiscalCard({ clinicId }: { clinicId?: string }) {
    const [estado, setEstado] = useState<EstadoWebhook | null>(null);
    const [carregando, setCarregando] = useState(false);
    const [cadastrando, setCadastrando] = useState(false);
    const headers = clinicId ? { 'X-Clinic-Id': clinicId } : {};

    const carregar = useCallback(async () => {
        setCarregando(true);
        try {
            setEstado((await api.get('/fiscal/webhook-config', { headers })).data);
        } catch {
            setEstado(null);
        } finally {
            setCarregando(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clinicId]);

    useEffect(() => {
        carregar();
    }, [carregar]);

    async function cadastrar() {
        setCadastrando(true);
        try {
            const r = (await api.post('/fiscal/webhook-config', {}, { headers })).data;
            if (r.ok) toast.success('Webhook cadastrado no serviço fiscal.');
            else toast.error(`Webhook não cadastrado: ${r.message}`, { duration: 12000 });
        } catch (e) {
            const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            toast.error(msg || 'Não foi possível cadastrar o webhook.');
        } finally {
            setCadastrando(false);
            carregar();
        }
    }

    const problema =
        estado?.problemaDeConfiguracao ||
        estado?.ultimoCadastro.erro ||
        estado?.erroConsulta ||
        (estado?.consultado && !estado.ativo ? 'O webhook deste ERP não está cadastrado no serviço fiscal.' : null);

    return (
        <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <p className="font-medium text-sm">Avisos do serviço fiscal (webhook)</p>
                    <p className="text-xs text-gray-500">
                        Endereço para onde o serviço fiscal avisa de nota autorizada, recusada, cancelada e do certificado vencendo.
                    </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={cadastrar} disabled={cadastrando || carregando}>
                    {cadastrando ? <Loader2 className="h-4 w-4 animate-spin" /> : estado?.ativo ? 'Cadastrar de novo' : 'Cadastrar webhook'}
                </Button>
            </div>
            {carregando && !estado && (
                <p className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Consultando o serviço fiscal…
                </p>
            )}
            {estado && (
                <dl className="grid grid-cols-1 gap-y-1 text-sm">
                    <div>
                        <dt className="inline text-gray-500">Endereço deste ERP: </dt>
                        <dd className="inline font-medium break-all">{estado.urlConfigurada || '— (não configurado no servidor)'}</dd>
                    </div>
                    <div>
                        <dt className="inline text-gray-500">No serviço fiscal: </dt>
                        <dd className={`inline font-medium ${estado.ativo ? 'text-green-700' : 'text-red-700'}`}>
                            {estado.consultado ? (estado.ativo ? 'cadastrado e ativo' : 'NÃO cadastrado') : 'não consultado'}
                        </dd>
                    </div>
                    {estado.ultimoCadastro.em && (
                        <div>
                            <dt className="inline text-gray-500">Último cadastro: </dt>
                            <dd className="inline font-medium">{new Date(estado.ultimoCadastro.em).toLocaleString('pt-BR')}</dd>
                        </div>
                    )}
                </dl>
            )}
            {problema && (
                <p className="text-sm rounded border border-red-300 bg-red-50 text-red-800 p-2">
                    ⛔ {problema} Sem o webhook, as notas só são atualizadas pela conferência periódica, com atraso, e o aviso de
                    certificado vencendo não chega.
                </p>
            )}
        </div>
    );
}
