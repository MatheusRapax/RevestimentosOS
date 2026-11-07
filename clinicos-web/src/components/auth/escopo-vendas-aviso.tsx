'use client';

import { Eye } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

/**
 * Aviso para quem não tem a permissão "Ver as vendas de todos os vendedores": a lista mostra só as vendas
 * dele. Sem o aviso, o vendedor acharia que sumiram orçamentos ou pedidos.
 */
export function EscopoVendasAviso({ assunto = 'vendas' }: { assunto?: string }) {
  const { user, activeClinic: activeClinicId } = useAuth();
  const permissoes = user?.clinics.find((c) => c.id === activeClinicId)?.permissions || [];
  const veTudo = Boolean(user?.isSuperAdmin) || permissoes.includes('sales.view.all');
  if (!user || veTudo) return null;

  return (
    <p className="flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
      <Eye className="h-4 w-4 shrink-0" />
      <span>
        Você está vendo apenas as <b>suas {assunto}</b>. Quem tem a permissão “Ver as vendas de todos os
        vendedores” enxerga as de toda a equipe.
      </span>
    </p>
  );
}
