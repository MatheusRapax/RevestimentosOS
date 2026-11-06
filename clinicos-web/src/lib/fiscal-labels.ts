// Linguagem simples para a emissão de NF-e: o operador não precisa saber o que é
// CFOP, CST ou NCM — os códigos ficam em "detalhes fiscais" e o resto vira texto.

export interface NcmSugestao {
  codigo: string; // 8 dígitos, sem pontos
  nome: string; // como o lojista chama o produto
}

/**
 * Atalhos comuns de loja de revestimentos. Cada código foi conferido na tabela
 * oficial (BrasilAPI /ncm). É sugestão, não regra: o contador do cliente manda.
 */
export const NCM_SUGESTOES: NcmSugestao[] = [
  { codigo: '69072100', nome: 'Porcelanato / piso cerâmico (absorção de água até 0,5%)' },
  { codigo: '69072200', nome: 'Piso / revestimento cerâmico (absorção acima de 0,5% até 10%)' },
  { codigo: '69072300', nome: 'Piso / revestimento cerâmico (absorção acima de 10%)' },
  { codigo: '69073000', nome: 'Pastilhas e mosaicos cerâmicos' },
  { codigo: '69074000', nome: 'Peças de acabamento cerâmicas (rodapé, cantoneira)' },
  { codigo: '39181000', nome: 'Piso vinílico' },
  { codigo: '32149000', nome: 'Argamassa / rejunte (confirme com o contador)' },
  { codigo: '25232910', nome: 'Cimento comum' },
];

export const formatNcm = (codigo: string) =>
  codigo.length === 8 ? `${codigo.slice(0, 4)}.${codigo.slice(4, 6)}.${codigo.slice(6)}` : codigo;

export interface NcmResultado {
  codigo: string; // 8 dígitos
  descricao: string;
}

const limparDescricao = (d: string) => d.replace(/^[-\s]+/, '').trim();

/** Descrição oficial de um NCM de 8 dígitos; null se não existir (ou se a consulta falhar). */
export async function consultarNcm(codigo: string): Promise<NcmResultado | null> {
  if (!/^\d{8}$/.test(codigo)) return null;
  try {
    const r = await fetch(`https://brasilapi.com.br/api/ncm/v1/${codigo}`);
    if (!r.ok) return null;
    const d = await r.json();
    return { codigo, descricao: limparDescricao(String(d.descricao ?? '')) };
  } catch {
    return null;
  }
}

/** Busca por texto na tabela oficial; só devolve códigos completos (8 dígitos). */
export async function buscarNcm(termo: string): Promise<NcmResultado[]> {
  if (termo.trim().length < 3) return [];
  try {
    const r = await fetch(`https://brasilapi.com.br/api/ncm/v1?search=${encodeURIComponent(termo.trim())}`);
    if (!r.ok) return [];
    const lista = (await r.json()) as { codigo: string; descricao: string }[];
    return lista
      .map((i) => ({ codigo: String(i.codigo).replace(/\D/g, ''), descricao: limparDescricao(i.descricao) }))
      .filter((i) => i.codigo.length === 8)
      .slice(0, 12);
  } catch {
    return [];
  }
}

export const ORIGENS: { value: string; label: string; avancada?: boolean }[] = [
  { value: '0', label: 'Nacional (fabricado no Brasil)' },
  { value: '2', label: 'Importado, comprado de empresa no Brasil' },
  { value: '1', label: 'Importado por mim (importação direta)' },
  { value: '3', label: 'Nacional, com mais de 40% de conteúdo importado (até 70%)', avancada: true },
  { value: '4', label: 'Nacional, produção em processos produtivos básicos', avancada: true },
  { value: '5', label: 'Nacional, com até 40% de conteúdo importado', avancada: true },
  { value: '6', label: 'Importado direto, sem similar nacional', avancada: true },
  { value: '7', label: 'Importado no mercado interno, sem similar nacional', avancada: true },
  { value: '8', label: 'Nacional, com mais de 70% de conteúdo importado', avancada: true },
];

/** Nome curto da origem, para mostrar em listas. */
export const origemLabel = (v: number | string | null | undefined) =>
  ORIGENS.find((o) => o.value === String(v))?.label ?? '—';

/** Texto do tipo de operação calculado pelo ERP (dentro/fora do estado). */
export function operacaoLabel(op: { ufOrigem: string; ufDestino: string; interestadual: boolean } | null | undefined) {
  if (!op) return null;
  return op.interestadual
    ? `Venda para outro estado (${op.ufOrigem} → ${op.ufDestino})`
    : `Venda dentro do estado (${op.ufOrigem} → ${op.ufDestino})`;
}

/** Quem precisa agir, em vez do nome técnico do campo (`item.ncm`, `cliente.state`...). */
export function campoLabel(campo: string): string {
  const c = (campo || '').toLowerCase();
  if (c.startsWith('item') || c.includes('ncm') || c.includes('itens')) return 'Produto';
  if (c.startsWith('cliente') || c.startsWith('destinatario')) return 'Cliente';
  if (c.startsWith('emitente')) return 'Empresa';
  if (c.startsWith('pedido')) return 'Pedido';
  if (c.startsWith('totais')) return 'Valores';
  if (c === 'servico') return 'Serviço fiscal';
  if (c === 'motor de tributos') return 'Impostos';
  return 'Nota fiscal';
}
