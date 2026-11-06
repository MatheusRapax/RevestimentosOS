// Tradução dos status e eventos do NexosFiscal para o estado do FiscalDocument do ERP.
// Módulo puro (sem Prisma/HTTP) para ser testado sem subir nada.
// Contrato: NexosFiscal/docs/AJUSTES_ERP.md (A4, A9, B1) e docs/WEBHOOKS.md.

export type StatusLocal = 'PROCESSING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

const EM_ANDAMENTO = new Set(['PENDING', 'PROCESSING', 'QUEUED', 'AWAITING_SEFAZ']);

/**
 * Status textual do serviço fiscal → status do ERP.
 * - FAILED (falha definitiva) é erro, não "em processamento" (bug A9).
 * - AWAITING_SEFAZ (SEFAZ fora do ar; o serviço retoma sozinho) é "em andamento", nunca erro.
 * - Status desconhecido continua como "em andamento" (comportamento antigo), mas quem chama deve logar.
 */
export function mapearStatusNexos(status: string | null | undefined): {
  status: StatusLocal;
  conhecido: boolean;
} {
  const s = String(status ?? '').trim().toUpperCase();
  if (s === 'AUTHORIZED' || s === 'APPROVED' || s === 'CORRECTED') return { status: 'APPROVED', conhecido: true };
  if (s === 'REJECTED' || s === 'DENIED' || s === 'FAILED') return { status: 'REJECTED', conhecido: true };
  if (s === 'CANCELLED' || s === 'CANCELED') return { status: 'CANCELLED', conhecido: true };
  if (EM_ANDAMENTO.has(s)) return { status: 'PROCESSING', conhecido: true };
  return { status: 'PROCESSING', conhecido: false };
}

export const AGUARDANDO_SEFAZ_MENSAGEM =
  'Aguardando a SEFAZ; a nota será emitida automaticamente.';

/** "homologacao" | "producao" a partir do que o serviço (ou a config local) informar. */
export function normalizarAmbiente(valor: unknown): 'homologacao' | 'producao' | null {
  const v = String(valor ?? '').trim().toLowerCase();
  if (['homologacao', 'homologação', 'hom', '2', 'homologation'].includes(v)) return 'homologacao';
  if (['producao', 'produção', 'prod', '1', 'production'].includes(v)) return 'producao';
  return null;
}

/** Chaves em minúsculas: o serviço serializa em PascalCase ou camelCase conforme o caminho. */
export function chavesMinusculas(obj: any): Record<string, any> {
  const out: Record<string, any> = {};
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) out[k.toLowerCase()] = v;
  }
  return out;
}

export interface DocumentoLocal {
  status: string;
  cancelEventId?: string | null;
  cancelRequestedAt?: Date | null;
}

export type PlanoWebhook =
  | { acao: 'ignorar'; motivo: string }
  | { acao: 'atualizar'; dados: Record<string, any>; resumo: string };

const textoEvento = (tipo: string) =>
  tipo === 'CANCELLATION'
    ? 'Cancelamento'
    : tipo === 'CORRECTION_LETTER'
      ? 'Carta de correção'
      : 'Evento';

/**
 * Decide o que um webhook muda no documento. Regras (A4):
 * - evento que não muda o status NÃO apaga errorMessage nem reescreve uuid/chave/xml/danfe;
 * - EventRejected guarda o motivo por tipo de evento e a nota segue como estava;
 * - evento desconhecido ou sem efeito é ignorado (o chamador responde 200, nunca 500).
 */
export function planejarWebhook(
  evento: string | undefined,
  bruto: any,
  doc: DocumentoLocal,
): PlanoWebhook {
  const d = chavesMinusculas(bruto);
  const nome = String(evento ?? '').trim();

  // Campos de acompanhamento que o serviço pode mandar junto (B3): só entram se vierem.
  const acompanhamento: Record<string, any> = {};
  if (d.series != null && d.series !== '') acompanhamento.serie = String(d.series);
  if (d.number != null && d.number !== '') acompanhamento.number = String(d.number);
  const amb = normalizarAmbiente(d.environment);
  if (amb) acompanhamento.environment = amb;

  const referencias = () => {
    const r: Record<string, any> = {};
    const uuid = d.documentid;
    if (uuid) r.uuid = uuid;
    if (d.accesskey) r.key = d.accesskey;
    if (d.xmlpath) r.xmlUrl = d.xmlpath;
    if (d.pdfpath) r.danfeUrl = d.pdfpath;
    return r;
  };

  switch (nome) {
    case 'NFeAuthorized':
      if (doc.status === 'CANCELLED') {
        return { acao: 'ignorar', motivo: 'autorização atrasada de nota já cancelada' };
      }
      return {
        acao: 'atualizar',
        resumo: 'APPROVED',
        dados: { status: 'APPROVED', errorMessage: null, ...referencias(), ...acompanhamento },
      };

    case 'NFeRejected':
      if (doc.status === 'CANCELLED') {
        return { acao: 'ignorar', motivo: 'rejeição atrasada de nota já cancelada' };
      }
      return {
        acao: 'atualizar',
        resumo: 'REJECTED',
        dados: {
          status: 'REJECTED',
          errorMessage: d.rejectionreason || d.motivo || 'Nota rejeitada pela SEFAZ.',
          ...referencias(),
          ...acompanhamento,
        },
      };

    case 'NFeCanceled':
      return {
        acao: 'atualizar',
        resumo: 'CANCELLED',
        dados: {
          status: 'CANCELLED',
          cancelEventId: null,
          cancelRequestedAt: null,
          eventError: null,
          eventErrorType: null,
          ...acompanhamento,
        },
      };

    case 'EventRejected': {
      const tipo = String(d.eventtype ?? '').toUpperCase();
      if (tipo === 'DISABLEMENT') {
        return { acao: 'ignorar', motivo: 'inutilização recusada (não pertence a uma nota)' };
      }
      const motivo = d.motivo ? String(d.motivo) : 'sem detalhe do motivo';
      const cstat = d.cstat != null && d.cstat !== '' ? ` (cStat ${d.cstat})` : '';
      const dados: Record<string, any> = {
        eventError: `${textoEvento(tipo)} recusado pela SEFAZ: ${motivo}${cstat}`,
        eventErrorType: tipo || 'UNKNOWN',
      };
      if (tipo === 'CANCELLATION') {
        // a nota continua autorizada: sai do "cancelamento em andamento"
        dados.cancelEventId = null;
        dados.cancelRequestedAt = null;
      }
      return { acao: 'atualizar', resumo: `EventRejected/${dados.eventErrorType}`, dados };
    }

    case 'NFeDelayed':
      // B1: a SEFAZ está lenta/fora; a nota segue em andamento e o serviço retoma sozinho.
      return { acao: 'ignorar', motivo: 'nota em espera da SEFAZ (segue em andamento)' };

    case 'NFeCorrection':
      return { acao: 'ignorar', motivo: 'carta de correção registrada (sem mudança de status)' };

    case 'RangeDisabled':
      return { acao: 'ignorar', motivo: 'inutilização de faixa (sem nota associada)' };

    default:
      return { acao: 'ignorar', motivo: `evento desconhecido: ${nome || '(sem nome)'}` };
  }
}
