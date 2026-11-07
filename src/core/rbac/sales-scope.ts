import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  mixin,
  Type,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Visibilidade das vendas por vendedor.
 *
 * Quem tem a permissão `sales.view.all` vê as vendas de todos os vendedores; quem não tem vê só as
 * suas (orçamentos, pedidos e o que sai deles: entregas, notas fiscais, avarias). O vendedor de uma
 * venda é `sellerId` do orçamento e do pedido.
 */
export interface SalesScope {
  /** true = vê tudo */
  all: boolean;
  /** usuário logado (usado quando `all` é false) */
  userId: string | null;
}

export const SALES_VIEW_ALL = 'sales.view.all';

/**
 * Filtro Prisma por vendedor para somar ao `where` de orçamentos e pedidos.
 * Sem escopo informado (uso interno do sistema) não filtra; escopo restrito sem usuário não casa com nada.
 */
export function filtroDoVendedor(scope?: SalesScope | null): {
  sellerId?: string;
} {
  if (!scope || scope.all) return {};
  return { sellerId: scope.userId ?? '__nenhum__' };
}

/** Mesmo filtro, para entidades que chegam ao vendedor pelo pedido (entrega, avaria, nota fiscal). */
export function filtroDoVendedorPeloPedido(scope?: SalesScope | null): {
  order?: { sellerId: string };
} {
  if (!scope || scope.all) return {};
  return { order: { sellerId: scope.userId ?? '__nenhum__' } };
}

@Injectable()
export class SalesScopeService {
  constructor(private prisma: PrismaService) {}

  /** Descobre se o usuário vê as vendas de todos (permissão do papel dele na loja). */
  async resolver(
    userId: string | null | undefined,
    clinicId: string | null | undefined,
    isSuperAdmin = false,
  ): Promise<SalesScope> {
    if (isSuperAdmin) return { all: true, userId: userId ?? null };
    if (!userId || !clinicId) return { all: false, userId: userId ?? null };

    const vinculo = await this.prisma.clinicUser.findFirst({
      where: { userId, clinicId, active: true },
      select: {
        role: {
          select: {
            rolePermissions: {
              where: { permission: { key: SALES_VIEW_ALL } },
              select: { permissionId: true },
            },
          },
        },
      },
    });
    return { all: (vinculo?.role.rolePermissions.length ?? 0) > 0, userId };
  }

  /** Escopo de uma requisição (calculado uma vez e guardado em `req.salesScope`). */
  async daRequisicao(req: any): Promise<SalesScope> {
    if (req.salesScope) return req.salesScope as SalesScope;
    const userId = req.user?.id ?? req.user?.userId ?? null;
    req.salesScope = await this.resolver(
      userId,
      req.clinicId,
      Boolean(req.user?.isSuperAdmin),
    );
    return req.salesScope as SalesScope;
  }
}

export type EntidadeDeVenda =
  | 'quote'
  | 'order'
  | 'delivery'
  | 'fiscalDocument'
  | 'occurrence';

const NAO_ENCONTRADO: Record<EntidadeDeVenda, string> = {
  quote: 'Orçamento não encontrado',
  order: 'Pedido não encontrado',
  delivery: 'Entrega não encontrada',
  fiscalDocument: 'Documento fiscal não encontrado.',
  occurrence: 'Ocorrência não encontrada',
};

/**
 * Guard que impede abrir (ou mexer em) uma venda de outro vendedor pelo endereço direto.
 * Usa o parâmetro da rota (`id` por padrão). Para quem vê tudo, não faz nada. Responde como "não encontrado"
 * para não revelar que o registro existe. Rotas sem o parâmetro (listas, criação) passam: a lista filtra no serviço.
 */
export function SalesOwnerGuard(
  entidade: EntidadeDeVenda,
  parametro = 'id',
): Type<CanActivate> {
  @Injectable()
  class Guard implements CanActivate {
    constructor(
      private prisma: PrismaService,
      private escopo: SalesScopeService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const req = context.switchToHttp().getRequest();
      const id = req.params?.[parametro];
      if (!id) return true;

      const scope = await this.escopo.daRequisicao(req);
      if (scope.all) return true;

      const vendedor = await this.vendedorDe(
        entidade,
        String(id),
        req.clinicId,
      );
      if (vendedor === undefined) return true; // não existe: o controller responde o 404 normal
      if (vendedor !== scope.userId)
        throw new NotFoundException(NAO_ENCONTRADO[entidade]);
      return true;
    }

    /** undefined = não existe; null = existe sem vendedor identificável (negado a quem não vê tudo) */
    private async vendedorDe(
      e: EntidadeDeVenda,
      id: string,
      clinicId: string,
    ): Promise<string | null | undefined> {
      switch (e) {
        case 'quote': {
          const r = await this.prisma.quote.findFirst({
            where: { id, clinicId },
            select: { sellerId: true },
          });
          return r ? r.sellerId : undefined;
        }
        case 'order': {
          const r = await this.prisma.order.findFirst({
            where: { id, clinicId },
            select: { sellerId: true },
          });
          return r ? r.sellerId : undefined;
        }
        case 'delivery': {
          const r = await this.prisma.delivery.findFirst({
            where: { id, clinicId },
            select: { order: { select: { sellerId: true } } },
          });
          return r ? (r.order?.sellerId ?? null) : undefined;
        }
        case 'fiscalDocument': {
          const r = await this.prisma.fiscalDocument.findFirst({
            where: { id, clinicId },
            select: { order: { select: { sellerId: true } } },
          });
          return r ? (r.order?.sellerId ?? null) : undefined;
        }
        case 'occurrence': {
          const r = await this.prisma.occurrence.findFirst({
            where: { id, clinicId },
            select: { order: { select: { sellerId: true } } },
          });
          // avaria sem pedido (de compra/estoque) não pertence a nenhuma venda: segue o acesso normal
          return r ? (r.order ? r.order.sellerId : undefined) : undefined;
        }
      }
    }
  }
  return mixin(Guard);
}
