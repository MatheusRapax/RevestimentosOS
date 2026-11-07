'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface Vendedor {
  id: string;
  name: string;
  email: string;
  papel: string;
}

interface Aviso {
  pedidoId: string;
  mensagem: string;
}
interface ItemBloqueado {
  tipo: 'QUOTE' | 'ORDER';
  numero: number | null;
  motivo: string;
}
interface Previa {
  orcamentos: { id: string; numero: number; de: string }[];
  pedidos: { id: string; numero: number; de: string }[];
  bloqueados: ItemBloqueado[];
  ignorados: ItemBloqueado[];
  avisos: Aviso[];
}

/** O usuário tem a permissão de transferir vendas? (Super Admin sempre tem.) */
export function useTransferirVendas() {
  const { user, activeClinic: activeClinicId } = useAuth();
  const permissoes = user?.clinics.find((c) => c.id === activeClinicId)?.permissions || [];
  return Boolean(user?.isSuperAdmin) || permissoes.includes('sales.transfer');
}

/** Resumo legível do que será (ou foi) transferido. */
export function ResumoDaTransferencia({ previa }: { previa: Previa }) {
  const itens = [
    ...previa.orcamentos.map((o) => `Orçamento #${o.numero} (de ${o.de})`),
    ...previa.pedidos.map((p) => `Pedido #${p.numero} (de ${p.de})`),
  ];
  return (
    <div className="space-y-2 text-sm">
      {itens.length > 0 && (
        <div className="rounded-md border bg-slate-50 p-3">
          <p className="mb-1 font-medium text-slate-800">Será transferido:</p>
          <ul className="list-inside list-disc text-slate-700">
            {itens.slice(0, 8).map((t) => (
              <li key={t}>{t}</li>
            ))}
            {itens.length > 8 && <li>… e mais {itens.length - 8}</li>}
          </ul>
        </div>
      )}
      {previa.bloqueados.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-800">
          <p className="mb-1 font-medium">Não será transferido:</p>
          <ul className="list-inside list-disc">
            {previa.bloqueados.map((b, i) => (
              <li key={i}>
                {b.numero ? `${b.tipo === 'QUOTE' ? 'Orçamento' : 'Pedido'} #${b.numero}: ` : ''}
                {b.motivo}
              </li>
            ))}
          </ul>
        </div>
      )}
      {previa.ignorados.length > 0 && (
        <p className="text-xs text-slate-500">
          {previa.ignorados.length} item(ns) já são deste vendedor e foram ignorados.
        </p>
      )}
    </div>
  );
}

/** Aviso e confirmação quando há pedido de mês anterior (a comissão muda de mãos). */
export function AvisoDeComissao({
  avisos,
  confirmado,
  onConfirmar,
}: {
  avisos: Aviso[];
  confirmado: boolean;
  onConfirmar: (v: boolean) => void;
}) {
  if (avisos.length === 0) return null;
  return (
    <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4" /> A comissão muda de mãos
      </p>
      <ul className="list-inside list-disc">
        {avisos.slice(0, 6).map((a) => (
          <li key={a.pedidoId}>{a.mensagem}</li>
        ))}
        {avisos.length > 6 && <li>… e mais {avisos.length - 6} pedido(s) de meses anteriores</li>}
      </ul>
      <p className="text-xs">
        Se a comissão desse período já foi acertada, a transferência desfaz o que foi combinado. O sistema calcula a
        comissão pelo vendedor do pedido.
      </p>
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4"
          checked={confirmado}
          onChange={(e) => onConfirmar(e.target.checked)}
        />
        <span className="font-medium">Entendo e quero transferir mesmo assim</span>
      </label>
    </div>
  );
}

interface Props {
  tipo: 'quote' | 'order';
  id: string;
  numero?: number | string;
  /** chamado depois de transferir, para a tela recarregar */
  onTransferido?: () => void;
  className?: string;
}

/** Botão "Transferir venda" + diálogo. Só aparece para quem tem a permissão. */
export function TransferirVendaBotao({ tipo, id, numero, onTransferido, className }: Props) {
  const pode = useTransferirVendas();
  const [aberto, setAberto] = useState(false);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [paraId, setParaId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const corpo = () => ({
    paraVendedorId: paraId,
    ...(tipo === 'quote' ? { quoteIds: [id] } : { orderIds: [id] }),
    motivo: motivo.trim(),
    confirmarMesAnterior: confirmado,
  });

  useEffect(() => {
    if (!aberto) return;
    api
      .get('/sales/transfers/sellers')
      .then((r) => setVendedores(r.data))
      .catch(() => toast.error('Não foi possível carregar os vendedores.'));
  }, [aberto]);

  // a prévia mostra o par (orçamento + pedido) e os avisos antes de gravar
  useEffect(() => {
    setPrevia(null);
    setConfirmado(false);
    if (!aberto || !paraId) return;
    let vivo = true;
    setCarregando(true);
    api
      .post('/sales/transfers/preview', { paraVendedorId: paraId, ...(tipo === 'quote' ? { quoteIds: [id] } : { orderIds: [id] }) })
      .then((r) => vivo && setPrevia(r.data))
      .catch((e) => vivo && toast.error(e.response?.data?.message || 'Não foi possível calcular a transferência.'))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [aberto, paraId, tipo, id]);

  if (!pode) return null;

  const precisaConfirmar = (previa?.avisos.length ?? 0) > 0;
  const podeEnviar =
    Boolean(paraId) &&
    motivo.trim().length >= 5 &&
    !carregando &&
    !enviando &&
    ((previa?.orcamentos.length ?? 0) + (previa?.pedidos.length ?? 0) > 0) &&
    (!precisaConfirmar || confirmado);

  const enviar = async () => {
    setEnviando(true);
    try {
      const r = await api.post('/sales/transfers', corpo());
      toast.success(r.data?.mensagem || 'Venda transferida.');
      setAberto(false);
      setParaId('');
      setMotivo('');
      onTransferido?.();
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

  return (
    <>
      <Button type="button" variant="outline" className={className} onClick={() => setAberto(true)}>
        <ArrowRightLeft className="mr-2 h-4 w-4" />
        Transferir venda
      </Button>

      <Dialog open={aberto} onOpenChange={(o) => !enviando && setAberto(o)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Transferir {tipo === 'quote' ? 'orçamento' : 'pedido'}
              {numero ? ` #${numero}` : ''}
            </DialogTitle>
            <DialogDescription>
              Passa a venda para outro vendedor. O vendedor anterior deixa de vê-la. Orçamento e pedido do mesmo
              negócio vão juntos, e fica registrado quem transferiu e o motivo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="para-vendedor">Novo vendedor</Label>
              <select
                id="para-vendedor"
                value={paraId}
                onChange={(e) => setParaId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Escolha o vendedor…</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.papel})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="motivo-transferencia">Motivo da transferência</Label>
              <Textarea
                id="motivo-transferencia"
                rows={3}
                maxLength={500}
                placeholder="Ex.: o cliente passou a ser atendido pela Maria"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
              <p className="text-xs text-slate-500">Obrigatório, mínimo de 5 caracteres.</p>
            </div>

            {carregando && (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Calculando o que será transferido…
              </p>
            )}
            {previa && <ResumoDaTransferencia previa={previa} />}
            {previa && <AvisoDeComissao avisos={previa.avisos} confirmado={confirmado} onConfirmar={setConfirmado} />}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)} disabled={enviando}>
              Voltar
            </Button>
            <Button onClick={enviar} disabled={!podeEnviar} className="gap-2">
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
