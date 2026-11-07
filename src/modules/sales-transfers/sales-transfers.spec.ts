import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { SalesTransfersService } from './sales-transfers.service';
import { inicioDoMes, planejarTransferencia } from './transferencia-planejador';
import { CATALOGO } from '../../core/rbac/permission-catalog';

const HOJE = new Date('2026-11-15T12:00:00');
const MES_PASSADO = new Date('2026-10-20T12:00:00');
const MES_ATUAL = new Date('2026-11-03T12:00:00');

const orc = (id: string, over: any = {}) => ({
  id,
  number: 1,
  status: 'EM_ORCAMENTO',
  sellerId: 'ana',
  ...over,
});
const ped = (id: string, over: any = {}) => ({
  id,
  number: 10,
  status: 'CRIADO',
  sellerId: 'ana',
  quoteId: null,
  createdAt: MES_ATUAL,
  ...over,
});

describe('planejarTransferencia', () => {
  const plano = (orcamentos: any[], pedidos: any[], para = 'bia') =>
    planejarTransferencia({
      orcamentos,
      pedidos,
      paraVendedorId: para,
      hoje: HOJE,
    });

  it('orçamento em aberto e pedido do mês atual transferem sem aviso', () => {
    const r = plano([orc('q1')], [ped('o1')]);
    expect(r.orcamentos.map((o) => o.id)).toEqual(['q1']);
    expect(r.pedidos.map((p) => p.id)).toEqual(['o1']);
    expect(r.avisos).toEqual([]);
    expect(r.bloqueados).toEqual([]);
  });

  it('pedido de mês anterior gera aviso de comissão (e ainda é transferido, se confirmado)', () => {
    const r = plano([], [ped('o1', { number: 7, createdAt: MES_PASSADO })]);
    expect(r.pedidos).toHaveLength(1);
    expect(r.avisos).toEqual([
      {
        tipo: 'MES_ANTERIOR',
        pedidoId: 'o1',
        pedidoNumero: 7,
        mes: '10/2026',
        deVendedorId: 'ana',
      },
    ]);
  });

  it('orçamento em aberto de mês anterior NÃO gera aviso (orçamento não gera comissão)', () => {
    expect(plano([orc('q1')], []).avisos).toEqual([]);
  });

  it('pedido cancelado não é transferido', () => {
    const r = plano([], [ped('o1', { status: 'CANCELADO' })]);
    expect(r.pedidos).toEqual([]);
    expect(r.bloqueados[0]).toMatchObject({
      tipo: 'ORDER',
      id: 'o1',
      motivo: 'Pedido cancelado não é transferido.',
    });
  });

  it('orçamento convertido vai junto do pedido (o par é uma unidade)', () => {
    const r = plano(
      [orc('q1', { status: 'CONVERTIDO' })],
      [ped('o1', { quoteId: 'q1' })],
    );
    expect(r.orcamentos.map((o) => o.id)).toEqual(['q1']);
    expect(r.pedidos.map((p) => p.id)).toEqual(['o1']);
  });

  it('orçamento convertido com pedido cancelado fica de fora, e o pedido também', () => {
    const r = plano(
      [orc('q1', { status: 'CONVERTIDO' })],
      [ped('o1', { quoteId: 'q1', status: 'CANCELADO' })],
    );
    expect(r.orcamentos).toEqual([]);
    expect(r.pedidos).toEqual([]);
    expect(r.bloqueados.map((b) => `${b.tipo}:${b.id}`).sort()).toEqual([
      'ORDER:o1',
      'QUOTE:q1',
    ]);
  });

  it('orçamento convertido sem pedido localizado não vai sozinho', () => {
    const r = plano([orc('q1', { status: 'CONVERTIDO' })], []);
    expect(r.orcamentos).toEqual([]);
    expect(r.bloqueados[0].motivo).toMatch(/não é transferido sozinho/);
  });

  it('o que já é do vendedor de destino é ignorado', () => {
    const r = plano(
      [orc('q1', { sellerId: 'bia' })],
      [ped('o1', { sellerId: 'bia' })],
    );
    expect(r.orcamentos).toEqual([]);
    expect(r.pedidos).toEqual([]);
    expect(r.ignorados).toHaveLength(2);
    expect(r.avisos).toEqual([]);
  });

  it('inicioDoMes: dia 1 às 00:00', () => {
    expect(inicioDoMes(HOJE).getDate()).toBe(1);
    expect(inicioDoMes(HOJE).getHours()).toBe(0);
    expect(inicioDoMes(HOJE).getMonth()).toBe(HOJE.getMonth());
  });
});

describe('SalesTransfersService', () => {
  const todos = { all: true, userId: 'gerente' };
  const so = { all: false, userId: 'ana' };

  function montar(
    opc: {
      destinoValido?: boolean;
      quotes?: any[];
      orders?: any[];
      pares?: any[];
      quotesDosPedidos?: any[];
    } = {},
  ) {
    const tx: any = {
      quote: { update: jest.fn().mockResolvedValue({}) },
      order: { update: jest.fn().mockResolvedValue({}) },
      quoteHistory: { create: jest.fn().mockResolvedValue({}) },
      salesTransfer: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma: any = {
      clinicUser: {
        findFirst: jest
          .fn()
          .mockResolvedValue(
            opc.destinoValido === false ? null : { id: 'cu1' },
          ),
        findMany: jest.fn().mockResolvedValue([]),
      },
      quote: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce(opc.quotes ?? [])
          .mockResolvedValue(opc.quotesDosPedidos ?? []),
      },
      order: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce(opc.orders ?? [])
          .mockResolvedValue(opc.pares ?? []),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'ana', name: 'Ana', email: 'a@x' },
          { id: 'bia', name: 'Bia', email: 'b@x' },
        ]),
      },
      salesTransfer: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn().mockImplementation((cb: any) => cb(tx)),
    };
    return { service: new SalesTransfersService(prisma), prisma, tx };
  }

  it('exige motivo (mínimo de 5 caracteres) e destino válido', async () => {
    const a = montar();
    await expect(
      a.service.transferir(
        'c1',
        'gerente',
        { paraVendedorId: 'bia', quoteIds: ['q1'], motivo: 'x' },
        todos,
      ),
    ).rejects.toThrow(/motivo/i);
    const b = montar({ destinoValido: false });
    await expect(
      b.service.transferir(
        'c1',
        'gerente',
        {
          paraVendedorId: 'fantasma',
          quoteIds: ['q1'],
          motivo: 'saiu da loja',
        },
        todos,
      ),
    ).rejects.toThrow(/usuário ativo desta loja/);
    expect(b.tx.quote.update).not.toHaveBeenCalled();
  });

  it('transfere orçamento (com histórico) e pedido (com rastro), tudo numa transação', async () => {
    const { service, tx, prisma } = montar({
      quotes: [orc('q1', { number: 5 })],
      orders: [ped('o1', { number: 9 })],
    });
    const r = await service.transferir(
      'c1',
      'gerente',
      {
        paraVendedorId: 'bia',
        quoteIds: ['q1'],
        orderIds: ['o1'],
        motivo: 'Ana saiu da loja',
      },
      todos,
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.quote.update).toHaveBeenCalledWith({
      where: { id: 'q1' },
      data: { sellerId: 'bia' },
    });
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 'o1' },
      data: { sellerId: 'bia' },
    });
    expect(tx.quoteHistory.create.mock.calls[0][0].data).toMatchObject({
      quoteId: 'q1',
      userId: 'gerente',
      action: 'TRANSFERIDO',
      notes: 'Transferido de Ana para Bia. Motivo: Ana saiu da loja',
    });
    const rastros = tx.salesTransfer.create.mock.calls.map(
      (c: any) => c[0].data,
    );
    expect(rastros.map((d: any) => d.entity).sort()).toEqual([
      'ORDER',
      'QUOTE',
    ]);
    expect(
      rastros.every(
        (d: any) =>
          d.fromSellerId === 'ana' &&
          d.toSellerId === 'bia' &&
          d.userId === 'gerente',
      ),
    ).toBe(true);
    expect(new Set(rastros.map((d: any) => d.batchId)).size).toBe(1); // mesma operação, mesmo lote
    expect(r.transferidos).toEqual({ orcamentos: 1, pedidos: 1 });
  });

  it('pedido de mês anterior pede confirmação (409) e não grava nada; com confirmação, grava e marca o impacto na comissão', async () => {
    const antigo = ped('o1', { number: 3, createdAt: MES_PASSADO });
    const a = montar({ orders: [antigo] });
    const dto: any = {
      paraVendedorId: 'bia',
      orderIds: ['o1'],
      motivo: 'repasse de carteira',
    };
    const falha: any = await a.service
      .transferir('c1', 'gerente', dto, todos)
      .catch((e) => e);
    expect(falha).toBeInstanceOf(ConflictException);
    expect(falha.getResponse().code).toBe('CONFIRMACAO_NECESSARIA');
    expect(falha.getResponse().avisos[0].mensagem).toMatch(
      /Pedido #3 é de 10\/2026/,
    );
    expect(a.prisma.$transaction).not.toHaveBeenCalled();

    const b = montar({ orders: [antigo] });
    await b.service.transferir(
      'c1',
      'gerente',
      { ...dto, confirmarMesAnterior: true },
      todos,
    );
    expect(
      b.tx.salesTransfer.create.mock.calls[0][0].data.commissionImpact,
    ).toBe(true);
  });

  it('puxa o orçamento do pedido e o pedido do orçamento (o par anda junto)', async () => {
    const { service, tx } = montar({
      orders: [ped('o1', { quoteId: 'q1' })],
      quotesDosPedidos: [orc('q1', { status: 'CONVERTIDO' })],
    });
    const r = await service.transferir(
      'c1',
      'gerente',
      {
        paraVendedorId: 'bia',
        orderIds: ['o1'],
        motivo: 'repasse de carteira',
      },
      todos,
    );
    expect(r.transferidos).toEqual({ orcamentos: 1, pedidos: 1 });
    expect(tx.quote.update).toHaveBeenCalledWith({
      where: { id: 'q1' },
      data: { sellerId: 'bia' },
    });
  });

  it('nada a transferir (tudo cancelado ou já do destino) é erro com os motivos', async () => {
    const { service, prisma } = montar({
      orders: [ped('o1', { status: 'CANCELADO' })],
    });
    const falha: any = await service
      .transferir(
        'c1',
        'gerente',
        {
          paraVendedorId: 'bia',
          orderIds: ['o1'],
          motivo: 'repasse de carteira',
        },
        todos,
      )
      .catch((e) => e);
    expect(falha).toBeInstanceOf(BadRequestException);
    expect(falha.getResponse().code).toBe('NADA_PARA_TRANSFERIR');
    expect(falha.getResponse().bloqueados[0].motivo).toMatch(/cancelado/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('quem não vê as vendas de todos só alcança as próprias: a busca já vem filtrada pelo vendedor', async () => {
    const { service, prisma } = montar({ quotes: [], orders: [] });
    await expect(
      service.previa(
        'c1',
        { paraVendedorId: 'bia', quoteIds: ['q-de-outro'] },
        so,
      ),
    ).resolves.toMatchObject({
      bloqueados: [{ id: 'q-de-outro', motivo: 'Orçamento não encontrado.' }],
    });
    expect(prisma.quote.findMany.mock.calls[0][0].where).toMatchObject({
      clinicId: 'c1',
      sellerId: 'ana',
    });
  });

  it('lote de outro vendedor é recusado a quem não vê tudo; a quem vê tudo, pega só o que está em aberto', async () => {
    const a = montar();
    await expect(
      a.service.previa(
        'c1',
        { paraVendedorId: 'bia', deVendedorId: 'carlos' },
        so,
      ),
    ).rejects.toThrow(ForbiddenException);

    const b = montar();
    b.prisma.quote.findMany.mockReset();
    b.prisma.quote.findMany.mockResolvedValue([]);
    b.prisma.order.findMany.mockReset();
    b.prisma.order.findMany.mockResolvedValue([]);
    await b.service
      .previa(
        'c1',
        { paraVendedorId: 'bia', deVendedorId: 'ana', quoteIds: ['q1'] },
        todos,
      )
      .catch(() => undefined);
    const filtroAbertos = b.prisma.order.findMany.mock.calls[0][0].where;
    expect(filtroAbertos).toMatchObject({
      sellerId: 'ana',
      status: { notIn: ['ENTREGUE', 'CANCELADO'] },
    });
    const filtroOrcamentos = b.prisma.quote.findMany.mock.calls[0][0].where;
    expect(filtroOrcamentos.status).toEqual({
      in: ['EM_ORCAMENTO', 'AGUARDANDO_APROVACAO', 'APROVADO'],
    });
  });

  it('a prévia não grava nada', async () => {
    const { service, prisma } = montar({ orders: [ped('o1')] });
    await service.previa(
      'c1',
      { paraVendedorId: 'bia', orderIds: ['o1'] },
      todos,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('catálogo: permissão de transferir', () => {
  it('existe, é sensível e fica em Vendas', () => {
    expect(CATALOGO['sales.transfer']).toMatchObject({
      categoria: 'vendas',
      sensivel: true,
      situacao: 'ativa',
    });
  });
});
