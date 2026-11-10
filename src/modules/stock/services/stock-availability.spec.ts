import {
  condicaoDeDisponibilidade,
  situacaoDoEstoque,
  SaldoDoProduto,
} from './stock-availability';
import { StockService } from '../stock.service';

const saldos: SaldoDoProduto[] = [
  { productId: 'muito', disponivel: 50, minStock: 10 },
  { productId: 'pouco', disponivel: 4, minStock: 10 },
  { productId: 'no-minimo', disponivel: 10, minStock: 10 },
  { productId: 'tudo-reservado', disponivel: 0, minStock: 0 },
  { productId: 'm2-fracionado', disponivel: 0.37, minStock: 0 },
  { productId: 'resto-de-arredondamento', disponivel: 1e-12, minStock: 0 },
];

describe('disponibilidade do estoque', () => {
  it('classifica como os selos da tela', () => {
    expect(situacaoDoEstoque(50, 10)).toBe('in_stock');
    expect(situacaoDoEstoque(10, 10)).toBe('low_stock');
    expect(situacaoDoEstoque(4, 10)).toBe('low_stock');
    expect(situacaoDoEstoque(0, 0)).toBe('out_of_stock');
    expect(situacaoDoEstoque(-2, 0)).toBe('out_of_stock');
  });

  it('"com estoque" traz todo produto com saldo disponível, inclusive abaixo do mínimo e fracionado', () => {
    expect(condicaoDeDisponibilidade('available', saldos)).toEqual({
      id: { in: ['muito', 'pouco', 'no-minimo', 'm2-fracionado'] },
    });
  });

  it('"sem estoque" exclui quem tem saldo disponível (sem lote ou tudo reservado ficam)', () => {
    expect(condicaoDeDisponibilidade('out_of_stock', saldos)).toEqual({
      id: { notIn: ['muito', 'pouco', 'no-minimo', 'm2-fracionado'] },
    });
  });

  it('acima do mínimo e baixa disponibilidade', () => {
    expect(condicaoDeDisponibilidade('in_stock', saldos)).toEqual({
      id: { in: ['muito', 'm2-fracionado'] },
    });
    expect(condicaoDeDisponibilidade('low_stock', saldos)).toEqual({
      id: { in: ['pouco', 'no-minimo'] },
    });
  });

  it('nenhum produto com saldo: "com estoque" não traz nada', () => {
    expect(condicaoDeDisponibilidade('available', [])).toEqual({
      id: { in: [] },
    });
  });
});

describe('StockService.listProducts: filtro de disponibilidade', () => {
  function build() {
    const prisma: any = {
      $queryRaw: jest.fn().mockResolvedValue(saldos),
      product: {
        count: jest.fn().mockResolvedValue(4),
        findMany: jest.fn().mockResolvedValue([]),
      },
      clinic: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const service = new StockService(prisma, {} as any);
    return { service, prisma };
  }

  it('filtra no banco, antes da paginação, e o total vem do mesmo filtro', async () => {
    const { service, prisma } = build();
    const r = await service.listProducts('c1', {
      status: 'available',
      page: 2,
      limit: 2,
      search: 'porcelanato',
    });
    const contagem = prisma.product.count.mock.calls[0][0].where;
    const busca = prisma.product.findMany.mock.calls[0][0];
    expect(contagem.id).toEqual({
      in: ['muito', 'pouco', 'no-minimo', 'm2-fracionado'],
    });
    expect(busca.where).toEqual(contagem);
    expect(busca.where.OR).toBeDefined(); // a busca por texto continua valendo junto
    expect(busca.skip).toBe(2);
    expect(busca.take).toBe(2);
    expect(r.meta).toEqual({ total: 4, page: 2, limit: 2, totalPages: 2 });
    // a consulta de saldo é sempre da loja da requisição
    expect(prisma.$queryRaw.mock.calls[0].slice(1)).toEqual(['c1', 'c1']);
  });

  it('sem filtro de disponibilidade não consulta saldos', async () => {
    const { service, prisma } = build();
    await service.listProducts('c1', {});
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(prisma.product.findMany.mock.calls[0][0].where.id).toBeUndefined();
  });
});
