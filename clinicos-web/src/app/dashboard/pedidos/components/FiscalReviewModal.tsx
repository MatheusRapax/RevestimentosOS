import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Settings,
  UserCog,
  Info,
  XCircle,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { campoLabel, formatNcm, operacaoLabel } from '@/lib/fiscal-labels';

interface FiscalError {
  campo: string;
  mensagem: string;
  severidade: 'error' | 'warning';
  origem: 'erp' | 'fiscal';
}

interface FiscalValidateResponse {
  valido: boolean;
  erros: FiscalError[];
  payload: {
    naturezaOperacao?: string;
    /** Tipo de operação calculado pelo ERP (estado do emitente x estado do cliente). */
    _operacao?: {
      ufOrigem: string;
      ufDestino: string;
      interestadual: boolean;
      descricao: string;
    } | null;
    destinatario: {
      razaoSocial: string;
      cnpjCpf: string;
      endereco: { municipio: string; uf: string };
    };
    itens: Array<{
      descricao: string;
      ncm: string;
      cfop: string;
      quantidade: number;
      valorUnitario: number;
      valorTotal: number;
      impostos: {
        icms: { cst: string; aliquota: number; baseCalculo?: number };
        pis: { cst: string; aliquota: number; baseCalculo?: number };
        cofins: { cst: string; aliquota: number; baseCalculo?: number };
      };
      _fiscalCalculado?: {
        icmsSt?: unknown;
        fcp?: unknown;
        difal?: unknown;
        ipi?: unknown;
        regrasAplicadas: string[];
      };
    }>;
    avisosFiscais: string[];
  };
}

interface FiscalReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  /** Emissão retornou "faltam dados fiscais no produto" — o pai abre o FastInputModal. */
  onMissingFiscalData: (
    products: {
      id: string;
      name: string;
      ncm?: string;
      cfop?: string;
      cst?: string;
      cest?: string;
      origin?: number;
      gtin?: string;
    }[],
  ) => void;
  /** Emissão concluída (ou já era um documento existente) — o pai atualiza a tela. */
  onEmitted: () => void;
}

const money = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type ItemRevisao = FiscalValidateResponse['payload']['itens'][number];

/** Soma dos impostos destacados no item (ICMS + PIS + COFINS), em reais. */
const impostosDoItem = (item: ItemRevisao) =>
  (['icms', 'pis', 'cofins'] as const).reduce((soma, k) => {
    const t = item.impostos[k];
    return soma + ((t.baseCalculo ?? item.valorTotal) * t.aliquota) / 100;
  }, 0);

export const FiscalReviewModal = ({
  isOpen,
  onClose,
  orderId,
  onMissingFiscalData,
  onEmitted,
}: FiscalReviewModalProps) => {
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<FiscalValidateResponse | null>(null);
  const [isEmitting, setIsEmitting] = useState(false);

  // Os codigos fiscais (NCM, CFOP, CST...) so aparecem para quem cuida da parte fiscal.
  const { user, activeClinic: activeClinicId } = useAuth();
  const permissoes = user?.clinics.find((c) => c.id === activeClinicId)?.permissions || [];
  const podeVerDetalhes = Boolean(user?.isSuperAdmin) || permissoes.includes('fiscal.config');

  useEffect(() => {
    if (!isOpen || !orderId) {
      setResult(null);
      return;
    }
    setIsValidating(true);
    api
      .post(`/fiscal/validate/${orderId}`)
      .then((resp) => setResult(resp.data))
      .catch((error: any) => {
        toast.error(
          error.response?.data?.message || 'Erro ao validar dados fiscais do pedido.',
        );
        onClose();
      })
      .finally(() => setIsValidating(false));
  }, [isOpen, orderId]);

  const handleEmit = async () => {
    if (!orderId) return;
    setIsEmitting(true);
    try {
      const resp = await api.post(`/fiscal/emit/${orderId}`);
      const status = resp.data?.status;
      if (status === 'APPROVED') {
        toast.success(resp.data.message || 'Nota já estava emitida e autorizada.');
      } else if (status === 'REJECTED') {
        toast.error(resp.data.message || 'Nota já emitida foi rejeitada pela SEFAZ.');
      } else {
        toast.success('Nota Fiscal enviada para processamento!');
      }
      onEmitted();
      onClose();
    } catch (error: any) {
      if (error.response?.data?.code === 'MISSING_FISCAL_DATA') {
        onMissingFiscalData(error.response.data.products || []);
        onClose();
      } else {
        toast.error(error.response?.data?.message || 'Erro ao emitir Nota Fiscal.');
      }
    } finally {
      setIsEmitting(false);
    }
  };

  const erros = result?.erros.filter((e) => e.severidade === 'error') || [];
  const avisos = [
    ...(result?.erros.filter((e) => e.severidade === 'warning') || []),
    ...(result?.payload?.avisosFiscais || []).map((m) => ({
      campo: 'motor de tributos',
      mensagem: m,
      severidade: 'warning' as const,
      origem: 'erp' as const,
    })),
  ];

  // Erros de item (NCM/CFOP/CST/Origem) se resolvem tentando emitir — o
  // backend responde MISSING_FISCAL_DATA e abrimos o FastInputModal. Erros
  // de emitente/cliente/totais precisam de ação fora deste fluxo.
  const somenteErrosDeItem = erros.length > 0 && erros.every((e) => e.campo.startsWith('item.'));
  const podeEmitir = erros.length === 0 || somenteErrosDeItem;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisão Fiscal — Antes de Emitir</DialogTitle>
          <DialogDescription>
            Confira a nota antes de enviar para a SEFAZ. O tipo da operação e os impostos
            são calculados automaticamente a partir do cadastro da empresa e do cliente.
          </DialogDescription>
        </DialogHeader>

        {isValidating ? (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Validando pedido...
          </div>
        ) : result ? (
          <div className="space-y-5">
            {/* Status geral */}
            {erros.length > 0 ? (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
                <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <p className="font-semibold text-red-800">
                    {somenteErrosDeItem
                      ? 'Faltam dados fiscais nos produtos — você pode preenchê-los e emitir a seguir.'
                      : 'Emissão bloqueada — corrija os itens abaixo antes de emitir.'}
                  </p>
                  <ul className="space-y-1.5">
                    {erros.map((e, i) => (
                      <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                        <span
                          title={e.campo}
                          className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                        >
                          {campoLabel(e.campo)}
                        </span>
                        <span>{e.mensagem}</span>
                      </li>
                    ))}
                  </ul>
                  {!somenteErrosDeItem && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {erros.some((e) => e.campo.startsWith('emitente.')) && (
                        <a href="/dashboard/configuracoes/fiscal" target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" className="gap-1.5 bg-white">
                            <Settings className="h-3.5 w-3.5" /> Dados da empresa (fiscal)
                          </Button>
                        </a>
                      )}
                      {erros.some((e) => e.campo.startsWith('cliente.')) && (
                        <a href="/dashboard/clientes" target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" className="gap-1.5 bg-white">
                            <UserCog className="h-3.5 w-3.5" /> Editar Cliente
                          </Button>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <p className="font-semibold text-green-800">
                  Tudo certo — pronto para emitir.
                </p>
              </div>
            )}

            {avisos.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="font-medium text-amber-800 flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4" /> Avisos (não bloqueiam a emissão)
                </p>
                <ul className="space-y-1">
                  {avisos.map((a, i) => (
                    <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                      <span
                        title={a.campo}
                        className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                      >
                        {campoLabel(a.campo)}
                      </span>
                      <span>{a.mensagem}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cliente e tipo de operação */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="border rounded-lg p-4 bg-slate-50">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Cliente
                </p>
                <p className="font-medium text-slate-900">
                  {result.payload.destinatario.razaoSocial}{' '}
                  <span className="text-slate-500 font-normal">
                    ({result.payload.destinatario.cnpjCpf})
                  </span>
                </p>
                <p className="text-sm text-slate-600">
                  {result.payload.destinatario.endereco.municipio || 'Cidade não informada'}
                  {result.payload.destinatario.endereco.uf
                    ? ` / ${result.payload.destinatario.endereco.uf}`
                    : ''}
                </p>
              </div>
              <div className="border rounded-lg p-4 bg-slate-50">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                  Tipo de operação
                </p>
                {result.payload._operacao ? (
                  <>
                    <p className="font-medium text-slate-900">
                      {operacaoLabel(result.payload._operacao)}
                    </p>
                    <p className="text-sm text-slate-600">
                      {result.payload.naturezaOperacao || 'Venda de mercadorias'} · definido
                      automaticamente pelo estado do cliente
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-amber-700">
                    Não deu para definir: falta o estado do cliente (ou da empresa) no cadastro.
                  </p>
                )}
              </div>
            </div>

            {/* Itens */}
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-3 py-2">Produto</th>
                    <th className="text-right px-3 py-2">Qtd</th>
                    <th className="text-right px-3 py-2">Valor total</th>
                    <th className="text-right px-3 py-2">Impostos na nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {result.payload.itens.map((item, i) => {
                    const imposto = impostosDoItem(item);
                    return (
                      <tr key={i}>
                        <td className="px-3 py-2 text-slate-800">{item.descricao}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{item.quantidade}</td>
                        <td className="px-3 py-2 text-right text-slate-800">
                          {money(item.valorTotal)}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">
                          {imposto > 0 ? money(imposto) : 'Sem destaque'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {podeVerDetalhes && (
              <details className="border rounded-lg bg-white">
                <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
                  Ver detalhes fiscais (códigos)
                </summary>
                <div className="overflow-x-auto border-t">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wide">
                      <tr>
                        <th className="text-left px-3 py-2">Produto</th>
                        <th className="text-left px-3 py-2">NCM</th>
                        <th className="text-left px-3 py-2">CFOP</th>
                        <th className="text-left px-3 py-2">ICMS</th>
                        <th className="text-left px-3 py-2">PIS/COFINS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {result.payload.itens.map((item, i) => {
                        const extras = item._fiscalCalculado;
                        const extraBadges = [
                          extras?.icmsSt && 'ST',
                          extras?.fcp && 'FCP',
                          extras?.difal && 'DIFAL',
                          extras?.ipi && 'IPI',
                        ].filter(Boolean) as string[];
                        return (
                          <tr key={i}>
                            <td className="px-3 py-2 text-slate-800">{item.descricao}</td>
                            <td className="px-3 py-2 font-mono text-xs text-slate-600">
                              {formatNcm(item.ncm || '')}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs text-slate-600">
                              {item.cfop}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {item.impostos.icms.cst} · {item.impostos.icms.aliquota}%
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>
                                  {item.impostos.pis.aliquota}% / {item.impostos.cofins.aliquota}%
                                </span>
                                {extraBadges.map((b) => (
                                  <span
                                    key={b}
                                    title="Calculado para referência — ainda sem transmissão ao NexosFiscal"
                                    className="text-[10px] font-semibold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded"
                                  >
                                    +{b}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            )}

            <div className="flex items-start gap-2 text-xs text-slate-500">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <p>
                O tipo da operação e os impostos são calculados sozinhos, a partir do estado do
                cliente e dos dados da empresa. Se algo parecer errado, corrija o cadastro do
                cliente ou do produto{podeVerDetalhes ? ' (ou a configuração fiscal)' : ''}.
                {podeVerDetalhes && (
                  <>
                    {' '}
                    <a
                      href="/dashboard/configuracoes/fiscal"
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-slate-700"
                    >
                      Abrir Configuração Fiscal
                    </a>
                    .
                  </>
                )}
              </p>
            </div>
          </div>
        ) : null}

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose} disabled={isEmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleEmit}
            disabled={isValidating || isEmitting || !podeEmitir}
            className="gap-2"
            title={
              !podeEmitir
                ? 'Corrija os erros de emitente/cliente/totais antes de emitir.'
                : undefined
            }
          >
            {isEmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Emitindo...
              </>
            ) : somenteErrosDeItem ? (
              'Preencher Dados e Emitir'
            ) : avisos.length > 0 ? (
              'Emitir Mesmo Assim'
            ) : (
              'Confirmar e Emitir'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
