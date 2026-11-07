'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

interface AlertaCertificado {
  nivel: 'warning' | 'critical' | 'expired';
  diasRestantes: number;
  notAfter: string;
  mensagem: string;
}

const ESTILO: Record<AlertaCertificado['nivel'], string> = {
  warning: 'border-amber-300 bg-amber-50 text-amber-900',
  critical: 'border-orange-400 bg-orange-50 text-orange-900',
  expired: 'border-red-400 bg-red-50 text-red-900',
};

/**
 * Aviso de vencimento do certificado A1, no topo de todas as telas, para quem cuida da configuração
 * fiscal. Só o aviso com folga pode ser dispensado (volta ao recarregar a página).
 */
export function CertificadoAlertaBanner() {
  const { user, activeClinic } = useAuth();
  const [dispensado, setDispensado] = useState(false);
  const permissoes = user?.clinics?.find((c) => c.id === activeClinic)?.permissions || [];
  const pode = Boolean(activeClinic) && (Boolean(user?.isSuperAdmin) || permissoes.includes('fiscal.config'));

  const { data } = useQuery<{ alerta: AlertaCertificado | null }>({
    queryKey: ['fiscal-certificate-alert', activeClinic],
    queryFn: async () => (await api.get('/fiscal/certificate-alert')).data,
    enabled: pode,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const alerta = data?.alerta;
  if (!pode || !alerta || (dispensado && alerta.nivel === 'warning')) return null;

  const Icone = alerta.nivel === 'expired' ? ShieldAlert : AlertTriangle;
  return (
    <div role="alert" className={`mb-4 flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm print:hidden ${ESTILO[alerta.nivel]}`}>
      <Icone className="h-5 w-5 shrink-0" />
      <p className="min-w-0 flex-1 font-medium">{alerta.mensagem}</p>
      <Link href="/dashboard/configuracoes/fiscal" className="shrink-0 font-semibold underline underline-offset-2">
        Abrir Configuração Fiscal
      </Link>
      {alerta.nivel === 'warning' && (
        <button type="button" aria-label="Dispensar aviso" className="shrink-0 rounded p-1 hover:bg-amber-100" onClick={() => setDispensado(true)}>
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
