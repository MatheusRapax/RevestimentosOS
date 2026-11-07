import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SalesScope } from '../../core/rbac/sales-scope';
import { TransferirVendasDto } from './dto/transferir-vendas.dto';
import {
  OrcamentoParaTransferir,
  PedidoParaTransferir,
  PlanoDeTransferencia,
  planejarTransferencia,
} from './transferencia-planejador';

/** Orçamentos que ainda estão "abertos" (para o lote "todas as vendas em aberto de um vendedor"). */
const ORCAMENTOS_ABERTOS = [
  'EM_ORCAMENTO',
  'AGUARDANDO_APROVACAO',
  'APROVADO',
] as const;
/** Pedidos em aberto: tudo que não terminou nem foi cancelado. */
const PEDIDOS_FECHADOS = ['ENTREGUE', 'CANCELADO'] as const;

/** Quem pode receber uma venda: usuário ativo da loja com papel que enxerga orçamentos ou pedidos. */
const PERMISSOES_DE_VENDA = ['quote.read', 'order.read'];

@Injectable()
export class SalesTransfersService {
  constructor(private prisma: PrismaService) {}

  /** Vendedores elegíveis como destino (ou origem): ativos na loja e com acesso a vendas. */
  async listarVendedores(clinicId: string) {
    const vinculos = await this.prisma.clinicUser.findMany({
      where: {
        clinicId,
        active: true,
        role: {
          rolePermissions: {
            some: { permission: { key: { in: PERMISSOES_DE_VENDA } } },
          },
        },
      },
      select: {
        user: { select: { id: true, name: true, email: true } },
        role: { select: { name: true } },
      },
      orderBy: { user: { name: 'asc' } },
    });
    return vinculos.map((v) => ({
      id: v.user.id,
      name: v.user.name ?? v.user.email,
      email: v.user.email,
      papel: v.role.name,
    }));
  }

  /** Vendas em aberto de um vendedor (para escolher uma a uma na tela de lote). */
  async listarAbertas(clinicId: string, vendedorId: string, scope: SalesScope) {
    this.assertPodeAgirSobre(vendedorId, scope);
    const [orcamentos, pedidos] = await Promise.all([
      this.prisma.quote.findMany({
        where: {
          clinicId,
          sellerId: vendedorId,
          status: { in: [...ORCAMENTOS_ABERTOS] },
        },
        select: {
          id: true,
          number: true,
          status: true,
          totalCents: true,
          createdAt: true,
          customer: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.findMany({
        where: {
          clinicId,
          sellerId: vendedorId,
          status: { notIn: [...PEDIDOS_FECHADOS] },
        },
        select: {
          id: true,
          number: true,
          status: true,
          totalCents: true,
          createdAt: true,
          quoteId: true,
          customer: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { orcamentos, pedidos };
  }

  /** Mostra o que aconteceria, sem gravar nada. */
  async previa(clinicId: string, dto: TransferirVendasDto, scope: SalesScope) {
    const plano = await this.montarPlano(clinicId, dto, scope);
    return this.resumir(clinicId, plano);
  }

  async transferir(
    clinicId: string,
    atorId: string,
    dto: TransferirVendasDto,
    scope: SalesScope,
  ) {
    const motivo = (dto.motivo ?? '').trim();
    if (motivo.length < 5) {
      throw new BadRequestException(
        'Informe o motivo da transferência (mínimo de 5 caracteres).',
      );
    }

    const plano = await this.montarPlano(clinicId, dto, scope);
    const resumo = await this.resumir(clinicId, plano);

    if (plano.orcamentos.length === 0 && plano.pedidos.length === 0) {
      throw new BadRequestException({
        message:
          'Não há nada para transferir. Veja os motivos nos itens bloqueados ou ignorados.',
        code: 'NADA_PARA_TRANSFERIR',
        ...resumo,
      });
    }

    // pedido de mês anterior muda a comissão de um período já passado: só com confirmação explícita
    if (plano.avisos.length > 0 && !dto.confirmarMesAnterior) {
      throw new ConflictException({
        message:
          'Há pedido de mês anterior na transferência: a comissão dele passa de um vendedor para o outro, inclusive no período já passado. Confirme para continuar.',
        code: 'CONFIRMACAO_NECESSARIA',
        ...resumo,
      });
    }

    const nomes = await this.nomesDosUsuarios([
      dto.paraVendedorId,
      ...plano.orcamentos.map((o) => o.sellerId),
      ...plano.pedidos.map((p) => p.sellerId),
    ]);
    const batchId = randomUUID();
    const para = nomes.get(dto.paraVendedorId) ?? dto.paraVendedorId;
    const pedidosComImpacto = new Set(plano.avisos.map((a) => a.pedidoId));

    await this.prisma.$transaction(async (tx) => {
      for (const o of plano.orcamentos) {
        await tx.quote.update({
          where: { id: o.id },
          data: { sellerId: dto.paraVendedorId },
        });
        await tx.quoteHistory.create({
          data: {
            quoteId: o.id,
            userId: atorId,
            action: 'TRANSFERIDO',
            notes: `Transferido de ${nomes.get(o.sellerId) ?? o.sellerId} para ${para}. Motivo: ${motivo}`,
          },
        });
        await tx.salesTransfer.create({
          data: {
            clinicId,
            entity: 'QUOTE',
            entityId: o.id,
            entityNumber: o.number,
            fromSellerId: o.sellerId,
            toSellerId: dto.paraVendedorId,
            userId: atorId,
            reason: motivo,
            batchId,
          },
        });
      }
      for (const p of plano.pedidos) {
        await tx.order.update({
          where: { id: p.id },
          data: { sellerId: dto.paraVendedorId },
        });
        await tx.salesTransfer.create({
          data: {
            clinicId,
            entity: 'ORDER',
            entityId: p.id,
            entityNumber: p.number,
            fromSellerId: p.sellerId,
            toSellerId: dto.paraVendedorId,
            userId: atorId,
            reason: motivo,
            commissionImpact: pedidosComImpacto.has(p.id),
            batchId,
          },
        });
      }
    });

    return {
      batchId,
      transferidos: {
        orcamentos: plano.orcamentos.length,
        pedidos: plano.pedidos.length,
      },
      bloqueados: resumo.bloqueados,
      ignorados: resumo.ignorados,
      mensagem: `Transferido para ${para}: ${plano.orcamentos.length} orçamento(s) e ${plano.pedidos.length} pedido(s).`,
    };
  }

  /** Histórico de transferências (quem vê tudo vê todas; os demais, só as que os envolvem). */
  async historico(clinicId: string, scope: SalesScope, limite = 100) {
    const meu = scope.userId ?? '__nenhum__';
    return this.prisma.salesTransfer.findMany({
      where: {
        clinicId,
        ...(scope.all
          ? {}
          : {
              OR: [{ fromSellerId: meu }, { toSellerId: meu }, { userId: meu }],
            }),
      },
      include: {
        fromSeller: { select: { id: true, name: true } },
        toSeller: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limite, 1), 500),
    });
  }

  // ── internos ──────────────────────────────────────────────────────────────

  /** Quem não vê as vendas de todos só mexe nas próprias. */
  private assertPodeAgirSobre(vendedorId: string, scope: SalesScope) {
    if (!scope.all && vendedorId !== scope.userId) {
      throw new ForbiddenException(
        'Você só pode transferir as suas próprias vendas. Para transferir as de outro vendedor é preciso ver as vendas de todos.',
      );
    }
  }

  private async montarPlano(
    clinicId: string,
    dto: TransferirVendasDto,
    scope: SalesScope,
  ): Promise<PlanoDeTransferencia> {
    await this.assertDestinoValido(clinicId, dto.paraVendedorId);

    const quoteIds = new Set(dto.quoteIds ?? []);
    const orderIds = new Set(dto.orderIds ?? []);
    if (dto.deVendedorId) {
      this.assertPodeAgirSobre(dto.deVendedorId, scope);
      const abertas = await this.listarAbertas(
        clinicId,
        dto.deVendedorId,
        scope,
      );
      abertas.orcamentos.forEach((o) => quoteIds.add(o.id));
      abertas.pedidos.forEach((p) => orderIds.add(p.id));
    }
    if (quoteIds.size === 0 && orderIds.size === 0) {
      throw new BadRequestException(
        'Escolha o que transferir: orçamentos, pedidos ou um vendedor inteiro.',
      );
    }

    // quem não vê tudo só alcança o que é seu: o que for de outro simplesmente "não existe" para ele
    const restricao = scope.all
      ? {}
      : { sellerId: scope.userId ?? '__nenhum__' };
    const [orcamentosEscolhidos, pedidosEscolhidos] = await Promise.all([
      this.prisma.quote.findMany({
        where: { clinicId, id: { in: [...quoteIds] }, ...restricao },
        select: { id: true, number: true, status: true, sellerId: true },
      }),
      this.prisma.order.findMany({
        where: { clinicId, id: { in: [...orderIds] }, ...restricao },
        select: {
          id: true,
          number: true,
          status: true,
          sellerId: true,
          quoteId: true,
          createdAt: true,
        },
      }),
    ]);

    // o par orçamento + pedido anda junto: puxa os pedidos dos orçamentos e os orçamentos dos pedidos
    const orcamentos = new Map<string, OrcamentoParaTransferir>(
      orcamentosEscolhidos.map((o) => [o.id, o]),
    );
    const pedidos = new Map<string, PedidoParaTransferir>(
      pedidosEscolhidos.map((p) => [p.id, p]),
    );

    const quotesSemPedidos = [...orcamentos.keys()];
    if (quotesSemPedidos.length > 0) {
      const pares = await this.prisma.order.findMany({
        where: { clinicId, quoteId: { in: quotesSemPedidos } },
        select: {
          id: true,
          number: true,
          status: true,
          sellerId: true,
          quoteId: true,
          createdAt: true,
        },
      });
      pares.forEach((p) => pedidos.set(p.id, p));
    }
    const quotesFaltando = [...pedidos.values()]
      .map((p) => p.quoteId)
      .filter(
        (id): id is string => Boolean(id) && !orcamentos.has(id as string),
      );
    if (quotesFaltando.length > 0) {
      const pares = await this.prisma.quote.findMany({
        where: { clinicId, id: { in: quotesFaltando } },
        select: { id: true, number: true, status: true, sellerId: true },
      });
      pares.forEach((o) => orcamentos.set(o.id, o));
    }

    const plano = planejarTransferencia({
      orcamentos: [...orcamentos.values()],
      pedidos: [...pedidos.values()],
      paraVendedorId: dto.paraVendedorId,
      hoje: new Date(),
    });

    // ids pedidos que não foram achados (ou são de outro vendedor para quem não vê tudo)
    const achados = new Set([...orcamentos.keys(), ...pedidos.keys()]);
    for (const id of quoteIds) {
      if (!achados.has(id)) {
        plano.bloqueados.push({
          tipo: 'QUOTE',
          id,
          numero: null,
          motivo: 'Orçamento não encontrado.',
        });
      }
    }
    for (const id of orderIds) {
      if (!achados.has(id)) {
        plano.bloqueados.push({
          tipo: 'ORDER',
          id,
          numero: null,
          motivo: 'Pedido não encontrado.',
        });
      }
    }
    return plano;
  }

  private async assertDestinoValido(clinicId: string, paraVendedorId: string) {
    const vinculo = await this.prisma.clinicUser.findFirst({
      where: {
        clinicId,
        userId: paraVendedorId,
        active: true,
        role: {
          rolePermissions: {
            some: { permission: { key: { in: PERMISSOES_DE_VENDA } } },
          },
        },
      },
      select: { id: true },
    });
    if (!vinculo) {
      throw new BadRequestException(
        'O vendedor de destino precisa ser um usuário ativo desta loja, com acesso a orçamentos ou pedidos.',
      );
    }
  }

  private async nomesDosUsuarios(ids: string[]) {
    const usuarios = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(ids)] } },
      select: { id: true, name: true, email: true },
    });
    return new Map(usuarios.map((u) => [u.id, u.name ?? u.email]));
  }

  /** Plano com nomes legíveis para a tela. */
  private async resumir(_clinicId: string, plano: PlanoDeTransferencia) {
    const nomes = await this.nomesDosUsuarios([
      ...plano.orcamentos.map((o) => o.sellerId),
      ...plano.pedidos.map((p) => p.sellerId),
    ]);
    return {
      orcamentos: plano.orcamentos.map((o) => ({
        id: o.id,
        numero: o.number,
        status: o.status,
        de: nomes.get(o.sellerId) ?? o.sellerId,
      })),
      pedidos: plano.pedidos.map((p) => ({
        id: p.id,
        numero: p.number,
        status: p.status,
        de: nomes.get(p.sellerId) ?? p.sellerId,
        criadoEm: p.createdAt,
      })),
      bloqueados: plano.bloqueados,
      ignorados: plano.ignorados,
      avisos: plano.avisos.map((a) => ({
        ...a,
        deVendedor: nomes.get(a.deVendedorId) ?? a.deVendedorId,
        mensagem: `Pedido #${a.pedidoNumero} é de ${a.mes}: a comissão dele passa para o novo vendedor, inclusive nesse mês já passado.`,
      })),
    };
  }
}
