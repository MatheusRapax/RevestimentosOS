/**
 * Filtro de disponibilidade do estoque (tela de Estoque e Catálogo de Vendas).
 *
 * "Disponível" = soma dos lotes com saldo menos as reservas ativas desses lotes, a mesma conta que a
 * listagem mostra em `availableStock` e que define o selo de cada produto na tela.
 */
export const FILTROS_DE_ESTOQUE = [
  'available', // com estoque disponível (qualquer quantidade acima de zero)
  'in_stock', // acima do estoque mínimo
  'low_stock', // com saldo, mas no mínimo ou abaixo dele
  'out_of_stock', // sem saldo disponível (sem lote ou tudo reservado)
] as const;

export type FiltroDeEstoque = (typeof FILTROS_DE_ESTOQUE)[number];

export interface SaldoDoProduto {
  productId: string;
  disponivel: number;
  minStock: number;
}

/** Folga para somas de quantidades fracionadas (m², por exemplo) não virarem "0,0000001 disponível". */
const ZERO = 1e-9;

export function situacaoDoEstoque(
  disponivel: number,
  minStock: number,
): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (disponivel <= ZERO) return 'out_of_stock';
  if (disponivel <= minStock) return 'low_stock';
  return 'in_stock';
}

/**
 * Condição de `where` (Prisma) que deixa só os produtos da situação pedida. Os saldos vêm apenas dos
 * produtos com algum lote com saldo; quem não aparece neles está sem estoque.
 */
export function condicaoDeDisponibilidade(
  filtro: FiltroDeEstoque,
  saldos: SaldoDoProduto[],
): { id: { in: string[] } } | { id: { notIn: string[] } } {
  const situacao = (s: SaldoDoProduto) =>
    situacaoDoEstoque(Number(s.disponivel), Number(s.minStock));
  const ids = (pred: (s: SaldoDoProduto) => boolean) =>
    saldos.filter(pred).map((s) => s.productId);

  switch (filtro) {
    case 'available':
      return { id: { in: ids((s) => situacao(s) !== 'out_of_stock') } };
    case 'in_stock':
      return { id: { in: ids((s) => situacao(s) === 'in_stock') } };
    case 'low_stock':
      return { id: { in: ids((s) => situacao(s) === 'low_stock') } };
    case 'out_of_stock':
      return { id: { notIn: ids((s) => situacao(s) !== 'out_of_stock') } };
  }
}
