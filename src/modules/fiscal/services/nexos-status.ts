// Tradução dos status e eventos do NexosFiscal para o estado do FiscalDocument do ERP.
// Módulo puro (sem Prisma/HTTP) para ser testado sem subir nada.
// Contrato: NexosFiscal/docs/AJUSTES_ERP.md (A4, A9, B1) e docs/WEBHOOKS.md.

export type StatusLocal = 'PROCESSING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

const EM_ANDAMENTO = new Set([
  'PENDING',
  'PROCESSING',
  'QUEUED',
  'AWAITING_SEFAZ',
]);

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
  const s = String(status ?? '')
    .trim()
    .toUpperCase();
  if (s === 'AUTHORIZED' || s === 'APPROVED' || s === 'CORRECTED')
    return { status: 'APPROVED', conhecido: true };
  if (s === 'REJECTED' || s === 'DENIED' || s === 'FAILED')
    return { status: 'REJECTED', conhecido: true };
  if (s === 'CANCELLED' || s === 'CANCELED')
    return { status: 'CANCELLED', conhecido: true };
  if (EM_ANDAMENTO.has(s)) return { status: 'PROCESSING', conhecido: true };
  return { status: 'PROCESSING', conhecido: false };
}

export const AGUARDANDO_SEFAZ_MENSAGEM =
  'Aguardando a SEFAZ; a nota será emitida automaticamente.';

/**
 * Texto de apoio de uma nota em AWAITING_SEFAZ. Nesse status `rejectionReason` é só a ÚLTIMA mensagem
 * de erro de comunicação (não uma rejeição) e `attempts` conta as tentativas (A11).
 */
export function detalheAguardandoSefaz(
  ultimoErro?: unknown,
  tentativas?: unknown,
): string {
  const partes = [AGUARDANDO_SEFAZ_MENSAGEM];
  const n = Number(tentativas);
  if (Number.isFinite(n) && n > 0) partes.push(`Tentativas: ${n}.`);
  const erro = String(ultimoErro ?? '').trim();
  if (erro) partes.push(`Último erro de comunicação: ${erro}`);
  return partes.join(' ');
}

/** "homologacao" | "producao" a partir do que o serviço (ou a config local) informar. */
export function normalizarAmbiente(
  valor: unknown,
): 'homologacao' | 'producao' | null {
  const v = String(valor ?? '')
    .trim()
    .toLowerCase();
  if (['homologacao', 'homologação', 'hom', '2', 'homologation'].includes(v))
    return 'homologacao';
  if (['producao', 'produção', 'prod', '1', 'production'].includes(v))
    return 'producao';
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
  if (d.series != null && d.series !== '')
    acompanhamento.serie = String(d.series);
  if (d.number != null && d.number !== '')
    acompanhamento.number = String(d.number);
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
        return {
          acao: 'ignorar',
          motivo: 'autorização atrasada de nota já cancelada',
        };
      }
      return {
        acao: 'atualizar',
        resumo: 'APPROVED',
        dados: {
          status: 'APPROVED',
          errorMessage: null,
          remoteStatus: 'AUTHORIZED',
          statusDetail: null,
          ...referencias(),
          ...acompanhamento,
        },
      };

    case 'NFeRejected':
      if (doc.status === 'CANCELLED') {
        return {
          acao: 'ignorar',
          motivo: 'rejeição atrasada de nota já cancelada',
        };
      }
      return {
        acao: 'atualizar',
        resumo: 'REJECTED',
        dados: {
          status: 'REJECTED',
          errorMessage:
            d.rejectionreason || d.motivo || 'Nota rejeitada pela SEFAZ.',
          // FAILED = falha interna (permite "tentar novamente"); REJECTED = recusa da SEFAZ
          remoteStatus: String(d.status ?? 'REJECTED').toUpperCase(),
          statusDetail: null,
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
          remoteStatus: 'CANCELLED',
          statusDetail: null,
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
        return {
          acao: 'ignorar',
          motivo: 'inutilização recusada (não pertence a uma nota)',
        };
      }
      const motivo = d.motivo ? String(d.motivo) : 'sem detalhe do motivo';
      const cstat =
        d.cstat != null && d.cstat !== '' ? ` (cStat ${d.cstat})` : '';
      const dados: Record<string, any> = {
        eventError: `${textoEvento(tipo)} recusado pela SEFAZ: ${motivo}${cstat}`,
        eventErrorType: tipo || 'UNKNOWN',
      };
      if (tipo === 'CANCELLATION') {
        // a nota continua autorizada: sai do "cancelamento em andamento"
        dados.cancelEventId = null;
        dados.cancelRequestedAt = null;
      }
      return {
        acao: 'atualizar',
        resumo: `EventRejected/${dados.eventErrorType}`,
        dados,
      };
    }

    case 'NFeDelayed':
      // A11: a SEFAZ está lenta/fora; a nota segue "em andamento" e o serviço retoma sozinho.
      // Nunca é erro. Guarda o aviso (e Number/Series/Environment, A12) sem apagar nada.
      if (doc.status === 'APPROVED' || doc.status === 'CANCELLED') {
        return {
          acao: 'ignorar',
          motivo: 'aviso de espera atrasado para nota já concluída',
        };
      }
      return {
        acao: 'atualizar',
        resumo: 'AWAITING_SEFAZ',
        dados: {
          status: 'PROCESSING',
          errorMessage: null,
          remoteStatus: 'AWAITING_SEFAZ',
          statusDetail: detalheAguardandoSefaz(d.motivo, d.attempts),
          ...(d.documentid ? { uuid: d.documentid } : {}),
          ...acompanhamento,
        },
      };

    case 'NFeCorrection':
      return {
        acao: 'ignorar',
        motivo: 'carta de correção registrada (sem mudança de status)',
      };

    case 'RangeDisabled':
      return {
        acao: 'ignorar',
        motivo: 'inutilização de faixa (sem nota associada)',
      };

    default:
      return {
        acao: 'ignorar',
        motivo: `evento desconhecido: ${nome || '(sem nome)'}`,
      };
  }
}

// ── Reconciliação (A7): rede de segurança quando um webhook se perde ─────────────────────────────

/** Nota como o serviço fiscal a devolve em GET /nfe e GET /nfe?updatedSince= */
export interface NotaRemota {
  id: string;
  externalId?: string | null;
  status: string;
  accessKey?: string | null;
  environment?: string | null;
  series?: number | string | null;
  number?: number | string | null;
  rejectionReason?: string | null;
  attempts?: number | null;
  updatedAt?: string | null;
}

export interface DocumentoReconciliavel extends DocumentoLocal {
  remoteStatus?: string | null;
  statusDetail?: string | null;
  uuid?: string | null;
  key?: string | null;
  serie?: string | null;
  number?: string | null;
  environment?: string | null;
}

/**
 * O que a consulta ao serviço corrige no documento local (ou null se já está certo).
 * O serviço é a fonte da verdade, com três travas: nota cancelada localmente não volta atrás,
 * nota autorizada não é "rebaixada" para em andamento por uma leitura atrasada e erro de comunicação
 * (AWAITING_SEFAZ) nunca vira rejeição.
 */
export function planejarReconciliacao(
  local: DocumentoReconciliavel,
  remota: NotaRemota,
): Record<string, any> | null {
  const dados: Record<string, any> = {};
  const alvo = mapearStatusNexos(remota.status).status;

  if (local.status !== 'CANCELLED' && alvo !== local.status) {
    if (alvo === 'APPROVED') {
      dados.status = 'APPROVED';
      dados.errorMessage = null;
    } else if (alvo === 'CANCELLED') {
      dados.status = 'CANCELLED';
      dados.cancelEventId = null;
      dados.cancelRequestedAt = null;
      dados.eventError = null;
      dados.eventErrorType = null;
    } else if (alvo === 'REJECTED') {
      dados.status = 'REJECTED';
      dados.errorMessage =
        remota.rejectionReason ||
        (String(remota.status).toUpperCase() === 'FAILED'
          ? 'Falha definitiva no processamento da nota no serviço fiscal.'
          : 'Nota rejeitada pela SEFAZ.');
    } else if (alvo === 'PROCESSING' && local.status !== 'APPROVED') {
      dados.status = 'PROCESSING';
      dados.errorMessage = null;
    }
  }

  // Status bruto do serviço (AWAITING_SEFAZ, FAILED...) e detalhe. Uma leitura atrasada não mexe
  // em nota cancelada nem rebaixa uma autorizada.
  const congelada =
    local.status === 'CANCELLED' ||
    (local.status === 'APPROVED' && alvo === 'PROCESSING');
  if (!congelada) {
    const bruto = String(remota.status ?? '').toUpperCase();
    if (bruto && bruto !== (local.remoteStatus ?? ''))
      dados.remoteStatus = bruto;
    const detalhe =
      bruto === 'AWAITING_SEFAZ'
        ? detalheAguardandoSefaz(remota.rejectionReason, remota.attempts)
        : null;
    if (detalhe !== (local.statusDetail ?? null)) dados.statusDetail = detalhe;
  }

  // Acompanhamento: série, número, ambiente, chave e referência da nota no serviço
  if (remota.id && !local.uuid) dados.uuid = remota.id;
  if (remota.accessKey && !local.key) dados.key = remota.accessKey;
  const amb = normalizarAmbiente(remota.environment);
  if (amb && amb !== local.environment) dados.environment = amb;
  if (remota.series != null && String(remota.series) !== (local.serie ?? ''))
    dados.serie = String(remota.series);
  if (remota.number != null && String(remota.number) !== (local.number ?? ''))
    dados.number = String(remota.number);

  return Object.keys(dados).length > 0 ? dados : null;
}

/** Evento de cancelamento como o serviço devolve em GET /nfe/{id}/events */
export interface EventoRemoto {
  id: string;
  type: string;
  status: string;
  cStat?: number | string | null;
  motivo?: string | null;
}

/**
 * Cancelamento em andamento no ERP + evento no serviço: se a SEFAZ já recusou (e o webhook
 * EventRejected se perdeu), volta ao normal e guarda o motivo; se já autorizou, a nota está cancelada.
 */
export function planejarCancelamentoPendente(
  local: DocumentoLocal,
  eventos: EventoRemoto[],
): Record<string, any> | null {
  if (!local.cancelRequestedAt) return null;
  const evento = eventos.find(
    (e) =>
      String(e.type).toUpperCase() === 'CANCELLATION' &&
      (!local.cancelEventId || e.id === local.cancelEventId),
  );
  if (!evento) return null;
  const st = String(evento.status).toUpperCase();
  if (st === 'AUTHORIZED') {
    return {
      status: 'CANCELLED',
      cancelEventId: null,
      cancelRequestedAt: null,
      eventError: null,
      eventErrorType: null,
    };
  }
  if (st === 'REJECTED') {
    const cstat =
      evento.cStat != null && evento.cStat !== ''
        ? ` (cStat ${evento.cStat})`
        : '';
    return {
      cancelEventId: null,
      cancelRequestedAt: null,
      eventError: `Cancelamento recusado pela SEFAZ: ${evento.motivo || 'sem detalhe do motivo'}${cstat}`,
      eventErrorType: 'CANCELLATION',
    };
  }
  return null; // PENDING: segue esperando
}

// ── Erros de validação devolvidos pelo serviço (400) ─────────────────────────────────────────────

export interface ErroRemoto {
  campo: string;
  mensagem: string;
  severidade?: string;
}

/**
 * O serviço recusa com DOIS formatos de 400: o documentado `{ message, erros: [{campo, mensagem}] }` (regras
 * de negócio) e o padrão ASP.NET `ProblemDetails` `{ title, errors: { "Itens[0].Cest": ["..."] } }` (formato
 * de campo, validado antes do pré-flight). Este helper entende os dois e devolve sempre a mesma lista.
 */
export function normalizarErrosRemotos(data: any): ErroRemoto[] {
  if (!data || typeof data !== 'object') return [];
  const lista: ErroRemoto[] = [];

  if (Array.isArray(data.erros)) {
    for (const e of data.erros) {
      lista.push({
        campo: String(e?.campo ?? 'nota'),
        mensagem: String(e?.mensagem ?? e?.message ?? ''),
        ...(e?.severidade ? { severidade: String(e.severidade) } : {}),
      });
    }
  }

  if (
    data.errors &&
    typeof data.errors === 'object' &&
    !Array.isArray(data.errors)
  ) {
    for (const [chave, valor] of Object.entries<any>(data.errors)) {
      // "Itens[0].Cest" -> "itens[0].cest" (mesmo estilo dos campos do /nfe/validate)
      const campo = chave.replace(
        /(^|\.)([A-Z])/g,
        (_m, ponto, letra) => ponto + letra.toLowerCase(),
      );
      const mensagens = Array.isArray(valor) ? valor : [valor];
      for (const m of mensagens) lista.push({ campo, mensagem: String(m) });
    }
  }
  return lista.filter((e) => e.mensagem.trim() !== '');
}

/**
 * Texto de erro do serviço fiscal. Ele responde com uma STRING pura (ex.: "Documento não encontrado.")
 * em vários 404/409, e com objeto { message } ou ProblemDetails { title } em outros.
 */
export function mensagemDoServico(data: any): string | undefined {
  if (typeof data === 'string') return data.trim() || undefined;
  if (data && typeof data === 'object') {
    const m = data.message ?? data.title ?? data.detail;
    return typeof m === 'string' && m.trim() ? m.trim() : undefined;
  }
  return undefined;
}
