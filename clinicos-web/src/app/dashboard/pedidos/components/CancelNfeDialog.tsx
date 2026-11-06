import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Ban, Clock, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

export interface FiscalDocInfo {
  id: string;
  status: string;
  environment?: string | null;
  remoteStatus?: string | null;
  statusDetail?: string | null;
  cancelRequestedAt?: string | null;
  cancelJustification?: string | null;
  eventError?: string | null;
  eventErrorType?: string | null;
}

const MIN = 15;
const MAX = 255;

/** Aviso, cancelamento em andamento e último evento recusado de uma nota; botão de cancelar. */
export function NfeStatusExtras({
  doc,
  onChanged,
}: {
  doc: FiscalDocInfo;
  onChanged: () => void;
}) {
  const { user, activeClinic: activeClinicId } = useAuth();
  const permissoes = user?.clinics.find((c) => c.id === activeClinicId)?.permissions || [];
  const podeCancelar = Boolean(user?.isSuperAdmin) || permissoes.includes('fiscal.cancel');
  const podeEmitir = Boolean(user?.isSuperAdmin) || permissoes.includes('fiscal.emit');

  const [aberto, setAberto] = useState(false);
  const [justificativa, setJustificativa] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [tentando, setTentando] = useState(false);

  const status = (doc.status || '').toUpperCase();
  const autorizada = status === 'APPROVED' || status === 'APROVADO';
  const emCancelamento = autorizada && Boolean(doc.cancelRequestedAt);
  const homologacao = (doc.environment || '').toLowerCase() === 'homologacao';
  const remoto = (doc.remoteStatus || '').toUpperCase();
  // SEFAZ fora do ar ou lenta: a nota é retomada sozinha. NUNCA é erro.
  const aguardandoSefaz = remoto === 'AWAITING_SEFAZ' && !autorizada;
  // Falha interna de processamento (não é recusa da SEFAZ): pode pedir nova tentativa.
  const falhaInterna = remoto === 'FAILED' && !autorizada;
  const tamanho = justificativa.trim().length;
  const valida = tamanho >= MIN && tamanho <= MAX;

  const tentarNovamente = async () => {
    setTentando(true);
    try {
      const resp = await api.post(`/fiscal/documents/${doc.id}/retry`);
      toast.success(resp.data?.message || 'Nova tentativa enviada.');
      onChanged();
    } catch (error: any) {
      const msg = error.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Não foi possível pedir nova tentativa.');
    } finally {
      setTentando(false);
    }
  };

  const enviar = async () => {
    if (!valida) return;
    setEnviando(true);
    try {
      const resp = await api.post(`/fiscal/documents/${doc.id}/cancel`, {
        justificativa: justificativa.trim(),
      });
      toast.success(resp.data?.message || 'Pedido de cancelamento enviado.');
      setAberto(false);
      setJustificativa('');
      onChanged();
    } catch (error: any) {
      const msg = error.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Não foi possível pedir o cancelamento.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      {homologacao && (
        <div className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
          <strong>Homologação — sem valor fiscal.</strong> Esta nota é de teste; não vale como documento.
        </div>
      )}

      {aguardandoSefaz && (
        <div className="mt-2 flex items-start gap-2 rounded bg-blue-50 p-2 text-xs text-blue-800">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>Aguardando a SEFAZ.</strong> A SEFAZ está fora do ar ou lenta; a nota será emitida
            automaticamente, sem você precisar fazer nada.
            {doc.statusDetail && (
              <span className="mt-1 block text-blue-700/80">{doc.statusDetail}</span>
            )}
          </span>
        </div>
      )}

      {(aguardandoSefaz || falhaInterna) && podeEmitir && (
        <div className="mt-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={tentarNovamente}
            disabled={tentando}
          >
            {tentando ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Tentar novamente
          </Button>
        </div>
      )}

      {emCancelamento && (
        <div className="mt-2 flex items-start gap-2 rounded bg-yellow-50 p-2 text-xs text-yellow-800">
          <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />
          <span>
            <strong>Cancelamento em andamento.</strong> A nota segue autorizada até a SEFAZ confirmar o
            cancelamento; a tela atualiza sozinha.
          </span>
        </div>
      )}

      {doc.eventError && !emCancelamento && (
        <div className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700">
          <strong>Aviso:</strong> {doc.eventError}
          {doc.eventErrorType === 'CANCELLATION' && ' A nota continua autorizada.'}
        </div>
      )}

      {autorizada && !emCancelamento && podeCancelar && (
        <div className="mt-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
            onClick={() => setAberto(true)}
          >
            <Ban className="h-3.5 w-3.5" /> Cancelar nota
          </Button>
        </div>
      )}

      <Dialog open={aberto} onOpenChange={(o) => !enviando && setAberto(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cancelar nota fiscal</DialogTitle>
            <DialogDescription>
              O cancelamento é enviado à SEFAZ e <b>não é instantâneo</b>: a nota só passa a cancelada
              quando a SEFAZ confirmar. A SEFAZ recusa o pedido fora do prazo legal (em geral, até 24 h
              após a autorização; varia por estado) e, nesse caso, a nota continua valendo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="justificativa-cancelamento">Motivo do cancelamento</Label>
            <Textarea
              id="justificativa-cancelamento"
              rows={4}
              maxLength={MAX}
              placeholder="Ex.: Cliente desistiu da compra antes do envio da mercadoria"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
            />
            <p className={`text-xs ${tamanho > 0 && !valida ? 'text-red-600' : 'text-slate-500'}`}>
              {tamanho}/{MAX} caracteres — mínimo de {MIN}.
            </p>
            <div className="flex items-start gap-2 rounded bg-amber-50 p-2 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Esta ação não pode ser desfeita depois que a SEFAZ confirmar.</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)} disabled={enviando}>
              Voltar
            </Button>
            <Button
              onClick={enviar}
              disabled={!valida || enviando}
              className="gap-2 bg-red-600 hover:bg-red-700"
            >
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              Pedir cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
