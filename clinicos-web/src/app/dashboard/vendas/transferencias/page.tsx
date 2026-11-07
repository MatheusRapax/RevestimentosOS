'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AvisoDeComissao,
  ResumoDaTransferencia,
  Vendedor,
} from '@/components/vendas/transferir-venda-botao';

interface Aberta {
  id: string;
  number: number;
  status: string;
  totalCents: number;
  createdAt: string;
  customer?: { name: string } | null;
}
interface Registro {
  id: string;
  entity: 'QUOTE' | 'ORDER';
  entityNumber: number | null;
  reason: string;
  commissionImpact: boolean;
  createdAt: string;
  fromSeller: { name: string | null };
  toSeller: { name: string | null };
  user: { name: string | null };
}

const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dia = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

const selectClasse =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

export default function TransferirVendasPage() {
  const { user, activeClinic: activeClinicId } = useAuth();
  const permissoes = user?.clinics.find((c) => c.id === activeClinicId)?.permissions || [];
  const veTudo = Boolean(user?.isSuperAdmin) || permissoes.includes('sales.view.all');

  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [deId, setDeId] = useState('');
  const [paraId, setParaId] = useState('');
  const [orcamentos, setOrcamentos] = useState<Aberta[]>([]);
  const [pedidos, setPedidos] = useState<Aberta[]>([]);
  const [marcadosQ, setMarcadosQ] = useState<Set<string>>(new Set());
  const [marcadosO, setMarcadosO] = useState<Set<string>>(new Set());
  const [motivo, setMotivo] = useState('');
  const [previa, setPrevia] = useState<any>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [historico, setHistorico] = useState<Registro[]>([]);

  const carregarHistorico = useCallback(() => {
    api.get('/sales/transfers').then((r) => setHistorico(r.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    api.get('/sales/transfers/sellers').then((r) => setVendedores(r.data)).catch(() => toast.error('Não foi possível carregar os vendedores.'));
    carregarHistorico();
  }, [carregarHistorico]);

  // quem não vê as vendas de todos só transfere as próprias: o "de" fica fixo em si mesmo
  useEffect(() => {
    if (!veTudo && user?.id) setDeId(user.id);
  }, [veTudo, user?.id]);

  const carregarAbertas = useCallback(async (vendedorId: string) => {
    if (!vendedorId) {
      setOrcamentos([]);
      setPedidos([]);
      return;
    }
    try {
      const r = await api.get('/sales/transfers/open', { params: { sellerId: vendedorId } });
      setOrcamentos(r.data.orcamentos);
      setPedidos(r.data.pedidos);
      setMarcadosQ(new Set(r.data.orcamentos.map((o: Aberta) => o.id)));
      setMarcadosO(new Set(r.data.pedidos.map((p: Aberta) => p.id)));
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Não foi possível carregar as vendas em aberto.');
    }
  }, []);

  useEffect(() => {
    carregarAbertas(deId);
  }, [deId, carregarAbertas]);

  const corpo = useMemo(
    () => ({ paraVendedorId: paraId, quoteIds: [...marcadosQ], orderIds: [...marcadosO] }),
    [paraId, marcadosQ, marcadosO],
  );

  // prévia sempre que a seleção ou o destino mudam
  useEffect(() => {
    setPrevia(null);
    setConfirmado(false);
    if (!paraId || (marcadosQ.size === 0 && marcadosO.size === 0)) return;
    let vivo = true;
    setCarregando(true);
    api
      .post('/sales/transfers/preview', corpo)
      .then((r) => vivo && setPrevia(r.data))
      .catch((e) => vivo && toast.error(e.response?.data?.message || 'Não foi possível calcular a transferência.'))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [corpo, paraId, marcadosQ.size, marcadosO.size]);

  const alternar = (conjunto: Set<string>, set: (s: Set<string>) => void, id: string) => {
    const novo = new Set(conjunto);
    novo.has(id) ? novo.delete(id) : novo.add(id);
    set(novo);
  };

  const precisaConfirmar = (previa?.avisos?.length ?? 0) > 0;
  const total = (previa?.orcamentos?.length ?? 0) + (previa?.pedidos?.length ?? 0);
  const podeEnviar = Boolean(paraId) && paraId !== deId && motivo.trim().length >= 5 && total > 0 && !carregando && !enviando && (!precisaConfirmar || confirmado);

  const transferir = async () => {
    setEnviando(true);
    try {
      const r = await api.post('/sales/transfers', { ...corpo, motivo: motivo.trim(), confirmarMesAnterior: confirmado });
      toast.success(r.data?.mensagem || 'Vendas transferidas.');
      setMotivo('');
      setParaId('');
      await carregarAbertas(deId);
      carregarHistorico();
    } catch (e: any) {
      const d = e.response?.data;
      if (d?.code === 'CONFIRMACAO_NECESSARIA') {
        setPrevia(d);
        toast.warning('Confirme o aviso de comissão para continuar.');
      } else {
        toast.error(Array.isArray(d?.message) ? d.message[0] : d?.message || 'Não foi possível transferir.');
      }
    } finally {
      setEnviando(false);
    }
  };

  const Linha = ({ item, marcado, onToggle, tipo }: { item: Aberta; marcado: boolean; onToggle: () => void; tipo: string }) => (
    <label className="flex cursor-pointer items-center gap-3 rounded border bg-white p-2 text-sm hover:bg-slate-50">
      <input type="checkbox" className="h-4 w-4" checked={marcado} onChange={onToggle} />
      <span className="w-28 font-medium">
        {tipo} #{item.number}
      </span>
      <span className="min-w-0 flex-1 truncate text-slate-600">{item.customer?.name ?? '—'}</span>
      <span className="text-slate-500">{dia(item.createdAt)}</span>
      <span className="w-28 text-right font-medium">{brl(item.totalCents)}</span>
    </label>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <ArrowRightLeft className="h-6 w-6" /> Transferir vendas
        </h1>
        <p className="text-gray-500">
          Passe as vendas em aberto de um vendedor para outro, por exemplo quando alguém sai da loja. Fica registrado quem
          transferiu e o motivo.
        </p>
      </div>

      <section className="space-y-4 rounded-lg border bg-white p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="de">De (vendedor atual)</Label>
            <select id="de" className={selectClasse} value={deId} disabled={!veTudo} onChange={(e) => setDeId(e.target.value)}>
              <option value="">Escolha o vendedor…</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.papel})
                </option>
              ))}
            </select>
            {!veTudo && (
              <p className="text-xs text-slate-500">
                Você pode transferir só as suas próprias vendas. Para transferir as de outro vendedor é preciso a permissão
                “Ver as vendas de todos os vendedores”.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="para">Para (novo vendedor)</Label>
            <select id="para" className={selectClasse} value={paraId} onChange={(e) => setParaId(e.target.value)}>
              <option value="">Escolha o vendedor…</option>
              {vendedores
                .filter((v) => v.id !== deId)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.papel})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {deId && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-800">
                Vendas em aberto ({orcamentos.length} orçamentos, {pedidos.length} pedidos)
              </h2>
              <div className="flex gap-3 text-xs">
                <button
                  type="button"
                  className="text-blue-700 hover:underline"
                  onClick={() => {
                    setMarcadosQ(new Set(orcamentos.map((o) => o.id)));
                    setMarcadosO(new Set(pedidos.map((p) => p.id)));
                  }}
                >
                  Marcar tudo
                </button>
                <button
                  type="button"
                  className="text-slate-600 hover:underline"
                  onClick={() => {
                    setMarcadosQ(new Set());
                    setMarcadosO(new Set());
                  }}
                >
                  Limpar
                </button>
              </div>
            </div>
            {orcamentos.length + pedidos.length === 0 && (
              <p className="rounded border border-dashed p-4 text-center text-sm text-slate-500">
                Este vendedor não tem vendas em aberto.
              </p>
            )}
            <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {orcamentos.map((o) => (
                <Linha key={o.id} item={o} tipo="Orçamento" marcado={marcadosQ.has(o.id)} onToggle={() => alternar(marcadosQ, setMarcadosQ, o.id)} />
              ))}
              {pedidos.map((p) => (
                <Linha key={p.id} item={p} tipo="Pedido" marcado={marcadosO.has(p.id)} onToggle={() => alternar(marcadosO, setMarcadosO, p.id)} />
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Orçamento convertido e o pedido dele vão sempre juntos. Pedido cancelado não é transferido. Vendas já
              entregues ou canceladas não aparecem aqui.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="motivo">Motivo da transferência</Label>
          <Textarea id="motivo" rows={2} maxLength={500} placeholder="Ex.: Ana saiu da empresa" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          <p className="text-xs text-slate-500">Obrigatório, mínimo de 5 caracteres.</p>
        </div>

        {carregando && (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Calculando o que será transferido…
          </p>
        )}
        {previa && <ResumoDaTransferencia previa={previa} />}
        {previa && <AvisoDeComissao avisos={previa.avisos ?? []} confirmado={confirmado} onConfirmar={setConfirmado} />}

        <div className="flex justify-end">
          <Button onClick={transferir} disabled={!podeEnviar} className="gap-2">
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
            Transferir {total > 0 ? `${total} venda(s)` : ''}
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-800">Histórico de transferências</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Data</th>
                <th className="px-3 py-2 text-left">Venda</th>
                <th className="px-3 py-2 text-left">De</th>
                <th className="px-3 py-2 text-left">Para</th>
                <th className="px-3 py-2 text-left">Por</th>
                <th className="px-3 py-2 text-left">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {historico.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    Nenhuma transferência registrada.
                  </td>
                </tr>
              )}
              {historico.map((h) => (
                <tr key={h.id}>
                  <td className="whitespace-nowrap px-3 py-2">{dia(h.createdAt)}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {h.entity === 'QUOTE' ? 'Orçamento' : 'Pedido'} #{h.entityNumber ?? '—'}
                    {h.commissionImpact && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800" title="Pedido de mês anterior: a comissão mudou de mãos">
                        comissão
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{h.fromSeller.name ?? '—'}</td>
                  <td className="px-3 py-2">{h.toSeller.name ?? '—'}</td>
                  <td className="px-3 py-2">{h.user.name ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{h.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
