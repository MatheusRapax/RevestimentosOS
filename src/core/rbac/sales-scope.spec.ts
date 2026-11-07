import { NotFoundException } from '@nestjs/common';
import {
  SalesOwnerGuard,
  SalesScope,
  SalesScopeService,
  filtroDoVendedor,
  filtroDoVendedorPeloPedido,
} from './sales-scope';
import { QuotesService } from '../../modules/quotes/quotes.service';
import { OrdersService } from '../../modules/orders/orders.service';
import { DeliveriesService } from '../../modules/deliveries/deliveries.service';

const todos: SalesScope = { all: true, userId: 'u-gerente' };
const so: SalesScope = { all: false, userId: 'u-ana' };

describe('filtros por vendedor', () => {
  it('quem vê tudo (ou uso interno, sem escopo) não filtra', () => {
    expect(filtroDoVendedor(todos)).toEqual({});
    expect(filtroDoVendedor(undefined)).toEqual({});
    expect(filtroDoVendedorPeloPedido(todos)).toEqual({});
    expect(filtroDoVendedorPeloPedido(null)).toEqual({});
  });

  it('quem não vê tudo filtra pelo próprio vendedor (direto ou pelo pedido)', () => {
    expect(filtroDoVendedor(so)).toEqual({ sellerId: 'u-ana' });
    expect(filtroDoVendedorPeloPedido(so)).toEqual({
      order: { sellerId: 'u-ana' },
    });
  });

  it('escopo restrito sem usuário não casa com nada (nunca vira "tudo")', () => {
    expect(filtroDoVendedor({ all: false, userId: null })).toEqual({
      sellerId: '__nenhum__',
    });
  });
});

describe('SalesScopeService', () => {
  const montar = (vinculo: any) => {
    const prisma: any = {
      clinicUser: { findFirst: jest.fn().mockResolvedValue(vinculo) },
    };
    return { service: new SalesScopeService(prisma), prisma };
  };

  it('papel com a permissão sales.view.all vê tudo', async () => {
    const { service, prisma } = montar({
      role: { rolePermissions: [{ permissionId: 'p1' }] },
    });
    expect(await service.resolver('u1', 'c1')).toEqual({
      all: true,
      userId: 'u1',
    });
    // consulta só pela permissão certa, na loja certa, de usuário ativo
    expect(prisma.clinicUser.findFirst.mock.calls[0][0].where).toEqual({
      userId: 'u1',
      clinicId: 'c1',
      active: true,
    });
    expect(
      prisma.clinicUser.findFirst.mock.calls[0][0].select.role.select
        .rolePermissions.where,
    ).toEqual({ permission: { key: 'sales.view.all' } });
  });

  it('papel sem a permissão, sem vínculo ativo ou sem identificação vê só o próprio', async () => {
    expect(
      (
        await montar({ role: { rolePermissions: [] } }).service.resolver(
          'u1',
          'c1',
        )
      ).all,
    ).toBe(false);
    expect((await montar(null).service.resolver('u1', 'c1')).all).toBe(false);
    expect((await montar(null).service.resolver(null, 'c1')).all).toBe(false);
    expect((await montar(null).service.resolver('u1', null)).all).toBe(false);
  });

  it('super admin vê tudo sem consultar o banco', async () => {
    const { service, prisma } = montar(null);
    expect((await service.resolver('u1', 'c1', true)).all).toBe(true);
    expect(prisma.clinicUser.findFirst).not.toHaveBeenCalled();
  });

  it('calcula uma vez por requisição e aceita req.user.id ou req.user.userId', async () => {
    const { service, prisma } = montar({ role: { rolePermissions: [] } });
    const req: any = { user: { userId: 'u9' }, clinicId: 'c1' };
    const a = await service.daRequisicao(req);
    const b = await service.daRequisicao(req);
    expect(a).toBe(b);
    expect(a.userId).toBe('u9');
    expect(prisma.clinicUser.findFirst).toHaveBeenCalledTimes(1);
  });
});

describe('SalesOwnerGuard (abrir venda de outro pelo endereço)', () => {
  const GuardDeOrcamento = SalesOwnerGuard('quote');

  function montar(escopo: SalesScope, tabelas: any = {}) {
    const prisma: any = {
      quote: { findFirst: jest.fn().mockResolvedValue(tabelas.quote) },
      order: { findFirst: jest.fn().mockResolvedValue(tabelas.order) },
      delivery: { findFirst: jest.fn().mockResolvedValue(tabelas.delivery) },
      fiscalDocument: {
        findFirst: jest.fn().mockResolvedValue(tabelas.fiscalDocument),
      },
      occurrence: {
        findFirst: jest.fn().mockResolvedValue(tabelas.occurrence),
      },
    };
    const escopoService: any = {
      daRequisicao: jest.fn().mockResolvedValue(escopo),
    };
    const contexto = (params: any): any => ({
      switchToHttp: () => ({
        getRequest: () => ({ params, clinicId: 'c1', user: { id: 'u-ana' } }),
      }),
    });
    const guard = (Classe: any) => new Classe(prisma, escopoService);
    return { prisma, contexto, guard };
  }

  it('quem vê tudo passa sem consultar nada', async () => {
    const { prisma, contexto, guard } = montar(todos);
    expect(
      await guard(GuardDeOrcamento).canActivate(contexto({ id: 'q1' })),
    ).toBe(true);
    expect(prisma.quote.findFirst).not.toHaveBeenCalled();
  });

  it('o vendedor abre o próprio orçamento', async () => {
    const { contexto, guard } = montar(so, { quote: { sellerId: 'u-ana' } });
    expect(
      await guard(GuardDeOrcamento).canActivate(contexto({ id: 'q1' })),
    ).toBe(true);
  });

  it('o vendedor NÃO abre o orçamento de outro: responde "não encontrado"', async () => {
    const { prisma, contexto, guard } = montar(so, {
      quote: { sellerId: 'u-bia' },
    });
    await expect(
      guard(GuardDeOrcamento).canActivate(contexto({ id: 'q1' })),
    ).rejects.toThrow(new NotFoundException('Orçamento não encontrado'));
    expect(prisma.quote.findFirst.mock.calls[0][0].where).toEqual({
      id: 'q1',
      clinicId: 'c1',
    });
  });

  it('rota sem o parâmetro (lista, criação) passa; id que não existe deixa o controller responder 404', async () => {
    const { contexto, guard } = montar(so, { quote: null });
    expect(await guard(GuardDeOrcamento).canActivate(contexto({}))).toBe(true);
    expect(
      await guard(GuardDeOrcamento).canActivate(contexto({ id: 'nao-existe' })),
    ).toBe(true);
  });

  it('pedido, entrega, nota fiscal e avaria seguem o vendedor do pedido', async () => {
    const dono = { sellerId: 'u-ana' };
    const outro = { order: { sellerId: 'u-bia' } };
    const meu = { order: { sellerId: 'u-ana' } };

    const pedido = montar(so, { order: dono });
    expect(
      await pedido
        .guard(SalesOwnerGuard('order'))
        .canActivate(pedido.contexto({ id: 'o1' })),
    ).toBe(true);

    const porParametro = montar(so, { order: { sellerId: 'u-bia' } });
    await expect(
      porParametro
        .guard(SalesOwnerGuard('order', 'orderId'))
        .canActivate(porParametro.contexto({ orderId: 'o1' })),
    ).rejects.toThrow(NotFoundException);

    const entrega = montar(so, { delivery: outro });
    await expect(
      entrega
        .guard(SalesOwnerGuard('delivery'))
        .canActivate(entrega.contexto({ id: 'd1' })),
    ).rejects.toThrow('Entrega não encontrada');

    const nota = montar(so, { fiscalDocument: meu });
    expect(
      await nota
        .guard(SalesOwnerGuard('fiscalDocument'))
        .canActivate(nota.contexto({ id: 'f1' })),
    ).toBe(true);

    const notaDeOutro = montar(so, { fiscalDocument: outro });
    await expect(
      notaDeOutro
        .guard(SalesOwnerGuard('fiscalDocument'))
        .canActivate(notaDeOutro.contexto({ id: 'f1' })),
    ).rejects.toThrow(NotFoundException);
  });

  it('nota ou entrega SEM pedido é negada a quem não vê tudo; avaria sem pedido segue o acesso normal', async () => {
    const semPedido = montar(so, { fiscalDocument: { order: null } });
    await expect(
      semPedido
        .guard(SalesOwnerGuard('fiscalDocument'))
        .canActivate(semPedido.contexto({ id: 'f1' })),
    ).rejects.toThrow(NotFoundException);

    const avariaSemPedido = montar(so, { occurrence: { order: null } });
    expect(
      await avariaSemPedido
        .guard(SalesOwnerGuard('occurrence'))
        .canActivate(avariaSemPedido.contexto({ id: 'a1' })),
    ).toBe(true);
    const avariaDeOutro = montar(so, {
      occurrence: { order: { sellerId: 'u-bia' } },
    });
    await expect(
      avariaDeOutro
        .guard(SalesOwnerGuard('occurrence'))
        .canActivate(avariaDeOutro.contexto({ id: 'a1' })),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('serviços aplicam o filtro por vendedor', () => {
  it('orçamentos: a lista de quem não vê tudo vai filtrada; a de quem vê tudo não', async () => {
    const prisma: any = {
      quote: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const servico: any = Object.create(QuotesService.prototype);
    servico.prisma = prisma;

    await servico.findAll('c1', undefined, so);
    expect(prisma.quote.findMany.mock.calls[0][0].where).toEqual({
      clinicId: 'c1',
      sellerId: 'u-ana',
    });
    await servico.findAll('c1', 'ENVIADO', todos);
    expect(prisma.quote.findMany.mock.calls[1][0].where).toEqual({
      clinicId: 'c1',
      status: 'ENVIADO',
    });
  });

  it('pedidos: lista e estatísticas só dos pedidos do vendedor', async () => {
    const prisma: any = {
      order: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const servico: any = Object.create(OrdersService.prototype);
    servico.prisma = prisma;

    await servico.findAll('c1', { status: 'all' }, so);
    expect(prisma.order.findMany.mock.calls[0][0].where).toEqual({
      clinicId: 'c1',
      sellerId: 'u-ana',
    });

    await servico.getStats('c1', so);
    const filtros = prisma.order.count.mock.calls.map((c: any) => c[0].where);
    expect(filtros).toHaveLength(5);
    filtros.forEach((w: any) =>
      expect(w).toMatchObject({ clinicId: 'c1', sellerId: 'u-ana' }),
    );

    prisma.order.count.mockClear();
    await servico.getStats('c1', todos);
    prisma.order.count.mock.calls.forEach((c: any) =>
      expect(c[0].where).not.toHaveProperty('sellerId'),
    );
  });

  it('entregas: a lista chega ao vendedor pelo pedido; agendar entrega em pedido de outro não acha o pedido', async () => {
    const prisma: any = {
      delivery: { findMany: jest.fn().mockResolvedValue([]) },
      order: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const servico: any = Object.create(DeliveriesService.prototype);
    servico.prisma = prisma;

    await servico.findAll('c1', undefined, so);
    expect(prisma.delivery.findMany.mock.calls[0][0].where).toEqual({
      clinicId: 'c1',
      order: { sellerId: 'u-ana' },
    });

    await expect(
      servico.create('c1', { orderId: 'o-de-outro' }, so),
    ).rejects.toThrow('Pedido não encontrado');
    expect(prisma.order.findFirst.mock.calls[0][0].where).toMatchObject({
      id: 'o-de-outro',
      clinicId: 'c1',
      sellerId: 'u-ana',
    });
  });
});
