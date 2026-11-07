// Regras da transferência de vendas entre vendedores, em função pura (sem banco) para testar à parte.

export interface OrcamentoParaTransferir {
  id: string;
  number: number;
  status: string;
  sellerId: string;
}

export interface PedidoParaTransferir {
  id: string;
  number: number;
  status: string;
  sellerId: string;
  quoteId: string | null;
  createdAt: Date;
}

export interface ItemBloqueado {
  tipo: 'QUOTE' | 'ORDER';
  id: string;
  numero: number | null;
  motivo: string;
}

export interface AvisoMesAnterior {
  tipo: 'MES_ANTERIOR';
  pedidoId: string;
  pedidoNumero: number;
  mes: string; // "10/2026"
  deVendedorId: string;
}

export interface PlanoDeTransferencia {
  orcamentos: OrcamentoParaTransferir[];
  pedidos: PedidoParaTransferir[];
  bloqueados: ItemBloqueado[];
  /** já eram do vendedor de destino: nada a fazer */
  ignorados: ItemBloqueado[];
  /** exigem confirmação explícita (a comissão muda de mãos num mês já passado) */
  avisos: AvisoMesAnterior[];
}

const CANCELADO = 'CANCELADO';
const CONVERTIDO = 'CONVERTIDO';

const mesAno = (d: Date) =>
  `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

/** Primeiro instante do mês de `hoje` (a comissão do mês corrente ainda está em aberto). */
export function inicioDoMes(hoje: Date): Date {
  const d = new Date(hoje);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Decide o que pode ser transferido para `paraVendedorId`.
 *
 * - Pedido cancelado não é transferido.
 * - Orçamento já convertido não vai sozinho: só junto de todos os seus pedidos; se algum deles está
 *   cancelado (ou não foi localizado), o par inteiro fica de fora.
 * - O que já pertence ao vendedor de destino é ignorado.
 * - Pedido de mês anterior ao atual transfere a comissão de um período que pode já ter sido acertado:
 *   gera um aviso que o usuário precisa confirmar.
 */
export function planejarTransferencia(entrada: {
  orcamentos: OrcamentoParaTransferir[];
  pedidos: PedidoParaTransferir[];
  paraVendedorId: string;
  hoje: Date;
}): PlanoDeTransferencia {
  const { paraVendedorId } = entrada;
  const limiteDoMes = inicioDoMes(entrada.hoje);
  const bloqueados: ItemBloqueado[] = [];
  const ignorados: ItemBloqueado[] = [];

  const pedidosPorOrcamento = new Map<string, PedidoParaTransferir[]>();
  for (const p of entrada.pedidos) {
    if (!p.quoteId) continue;
    pedidosPorOrcamento.set(p.quoteId, [
      ...(pedidosPorOrcamento.get(p.quoteId) ?? []),
      p,
    ]);
  }

  // 1) pedidos cancelados ficam de fora
  const pedidosBloqueados = new Set<string>();
  for (const p of entrada.pedidos) {
    if (p.status === CANCELADO) {
      pedidosBloqueados.add(p.id);
      bloqueados.push({
        tipo: 'ORDER',
        id: p.id,
        numero: p.number,
        motivo: 'Pedido cancelado não é transferido.',
      });
    }
  }

  // 2) orçamento convertido só vai com o par inteiro
  const orcamentosBloqueados = new Set<string>();
  for (const o of entrada.orcamentos) {
    if (o.status !== CONVERTIDO) continue;
    const pares = pedidosPorOrcamento.get(o.id) ?? [];
    if (pares.length === 0) {
      orcamentosBloqueados.add(o.id);
      bloqueados.push({
        tipo: 'QUOTE',
        id: o.id,
        numero: o.number,
        motivo:
          'Orçamento convertido não é transferido sozinho e o pedido dele não foi localizado.',
      });
    } else if (pares.some((p) => pedidosBloqueados.has(p.id))) {
      orcamentosBloqueados.add(o.id);
      bloqueados.push({
        tipo: 'QUOTE',
        id: o.id,
        numero: o.number,
        motivo:
          'O pedido deste orçamento está cancelado; o orçamento convertido não é transferido sozinho.',
      });
    }
  }

  // 3) o que sobra, menos o que já é do destino
  const orcamentos: OrcamentoParaTransferir[] = [];
  for (const o of entrada.orcamentos) {
    if (orcamentosBloqueados.has(o.id)) continue;
    if (o.sellerId === paraVendedorId) {
      ignorados.push({
        tipo: 'QUOTE',
        id: o.id,
        numero: o.number,
        motivo: 'Já é deste vendedor.',
      });
      continue;
    }
    orcamentos.push(o);
  }

  const pedidos: PedidoParaTransferir[] = [];
  const avisos: AvisoMesAnterior[] = [];
  for (const p of entrada.pedidos) {
    if (pedidosBloqueados.has(p.id)) continue;
    // pedido cujo orçamento ficou de fora não vai sozinho (o par é uma unidade)
    if (p.quoteId && orcamentosBloqueados.has(p.quoteId)) {
      bloqueados.push({
        tipo: 'ORDER',
        id: p.id,
        numero: p.number,
        motivo:
          'O orçamento deste pedido não pôde ser transferido; o par fica junto.',
      });
      continue;
    }
    if (p.sellerId === paraVendedorId) {
      ignorados.push({
        tipo: 'ORDER',
        id: p.id,
        numero: p.number,
        motivo: 'Já é deste vendedor.',
      });
      continue;
    }
    pedidos.push(p);
    if (p.createdAt < limiteDoMes) {
      avisos.push({
        tipo: 'MES_ANTERIOR',
        pedidoId: p.id,
        pedidoNumero: p.number,
        mes: mesAno(p.createdAt),
        deVendedorId: p.sellerId,
      });
    }
  }

  return { orcamentos, pedidos, bloqueados, ignorados, avisos };
}
