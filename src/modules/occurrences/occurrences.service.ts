import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { FinanceService } from '../finance/finance.service';
import { CreateOccurrenceDto } from './dto/create-occurrence.dto';
import { UpdateOccurrenceStatusDto } from './dto/update-occurrence.dto';
import {
  OccurrenceStatus,
  StockMovementType,
  OccurrenceType,
} from '@prisma/client';

@Injectable()
export class OccurrencesService {
  constructor(
    private prisma: PrismaService,
    private financeService: FinanceService,
  ) {}

  async create(clinicId: string, dto: CreateOccurrenceDto) {
    if (dto.type === OccurrenceType.RECEBIMENTO && !dto.supplierId) {
      throw new BadRequestException(
        'ID do Fornecedor é obrigatório para ocorrências de RECEBIMENTO',
      );
    }
    if (
      dto.type === OccurrenceType.ENTREGA &&
      !dto.customerId &&
      !dto.orderId
    ) {
      throw new BadRequestException(
        'ID do Cliente ou ID do Pedido é obrigatório para ocorrências de ENTREGA',
      );
    }

    const itemsData = dto.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitType: item.unitType || 'CAIXA',
      reason: item.reason,
    }));

    const occurrence = await this.prisma.occurrence.create({
      data: {
        clinicId,
        type: dto.type,
        supplierId: dto.supplierId,
        customerId: dto.customerId,
        orderId: dto.orderId,
        purchaseOrderId: dto.purchaseOrderId,
        stockEntryId: dto.stockEntryId,
        notes: dto.notes,
        items: {
          create: itemsData,
        },
      },
      include: {
        items: true,
      },
    });

    if (occurrence.status === OccurrenceStatus.REPORTADO) {
      await this.processReportedStatus(clinicId, occurrence);
    }

    return occurrence;
  }

  async findAll(clinicId: string) {
    return this.prisma.occurrence.findMany({
      where: { clinicId },
      include: {
        supplier: { select: { name: true } },
        customer: { select: { name: true } },
        order: { select: { number: true } },
        purchaseOrder: { select: { number: true } },
        items: {
          include: {
            product: {
              select: { name: true, sku: true, unit: true, piecesPerBox: true },
            },
            lot: { select: { lotNumber: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(clinicId: string, id: string) {
    const occurrence = await this.prisma.occurrence.findUnique({
      where: { id, clinicId },
      include: {
        supplier: true,
        customer: true,
        order: true,
        purchaseOrder: true,
        stockEntry: true,
        items: {
          include: {
            product: true,
            lot: true,
          },
        },
      },
    });

    if (!occurrence) throw new NotFoundException('Ocorrência não encontrada');
    return occurrence;
  }

  // Transições permitidas do ciclo de vida da ocorrência (F-RMA-3)
  private static readonly ALLOWED_TRANSITIONS: Record<
    OccurrenceStatus,
    OccurrenceStatus[]
  > = {
    [OccurrenceStatus.RASCUNHO]: [
      OccurrenceStatus.REPORTADO,
      OccurrenceStatus.CANCELADO,
    ],
    [OccurrenceStatus.REPORTADO]: [
      OccurrenceStatus.AGUARDANDO_FORNECEDOR,
      OccurrenceStatus.RESOLVIDO,
      OccurrenceStatus.REEMBOLSADO,
      OccurrenceStatus.CANCELADO,
    ],
    [OccurrenceStatus.AGUARDANDO_FORNECEDOR]: [
      OccurrenceStatus.RESOLVIDO,
      OccurrenceStatus.REEMBOLSADO,
      OccurrenceStatus.CANCELADO,
    ],
    [OccurrenceStatus.RESOLVIDO]: [],
    [OccurrenceStatus.REEMBOLSADO]: [],
    [OccurrenceStatus.CANCELADO]: [],
  };

  async updateStatus(
    clinicId: string,
    userId: string,
    id: string,
    dto: UpdateOccurrenceStatusDto,
  ) {
    const occurrence = await this.findOne(clinicId, id);

    if (occurrence.status === dto.status) {
      return occurrence; // No change
    }

    const allowed =
      OccurrencesService.ALLOWED_TRANSITIONS[
        occurrence.status as OccurrenceStatus
      ] || [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transição inválida: ${occurrence.status} → ${dto.status}.`,
      );
    }

    const stockWasDeducted =
      occurrence.status === OccurrenceStatus.REPORTADO ||
      occurrence.status === OccurrenceStatus.AGUARDANDO_FORNECEDOR;

    if (
      dto.status === OccurrenceStatus.REPORTADO &&
      occurrence.status === OccurrenceStatus.RASCUNHO
    ) {
      await this.processReportedStatus(clinicId, occurrence, userId);
    }

    if (
      dto.status === OccurrenceStatus.RESOLVIDO &&
      occurrence.status === OccurrenceStatus.AGUARDANDO_FORNECEDOR
    ) {
      await this.processResolvedStatus(
        clinicId,
        occurrence,
        dto.allocateToOrder,
        userId,
      );
    }

    // Cancelar uma ocorrência que já baixou estoque devolve o que foi baixado (F-RMA-1)
    if (dto.status === OccurrenceStatus.CANCELADO && stockWasDeducted) {
      await this.processCancelledStatus(clinicId, occurrence);
    }

    // Reembolso gera crédito na conta-corrente do cliente (F-RMA-2)
    if (dto.status === OccurrenceStatus.REEMBOLSADO) {
      await this.financeService.refundOccurrence(
        clinicId,
        {
          id: occurrence.id,
          number: occurrence.number,
          customerId: occurrence.customerId,
          orderId: occurrence.orderId,
          items: occurrence.items,
        },
        userId,
      );
    }

    return this.prisma.occurrence.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes
          ? `${occurrence.notes || ''}\n[Status Change]: ${dto.notes}`
          : occurrence.notes,
      },
      include: { items: true },
    });
  }

  /**
   * Devolve ao estoque a quantidade baixada no REPORTADO quando a ocorrência
   * é cancelada antes de ser resolvida.
   */
  private async processCancelledStatus(clinicId: string, occurrence: any) {
    await this.prisma.$transaction(async (tx) => {
      for (const item of occurrence.items) {
        let effectiveQuantity = item.quantity;
        if (item.unitType === 'UNIDADE') {
          const productData = await tx.product.findUnique({
            where: { id: item.productId },
          });
          if (productData?.piecesPerBox && productData.piecesPerBox > 0) {
            effectiveQuantity = item.quantity / productData.piecesPerBox;
          }
        }

        // Preferência: o(s) lote(s) que a avaria debitou
        const avariaMoves = await tx.stockMovement.findMany({
          where: {
            occurrenceId: occurrence.id,
            type: StockMovementType.AVARIA,
          },
        });

        let remaining = effectiveQuantity;
        const targets =
          avariaMoves.length > 0
            ? avariaMoves
                .filter((m) => m.productId === item.productId && m.lotId)
                .map((m) => ({ lotId: m.lotId as string, qty: -m.quantity }))
            : [];

        if (targets.length === 0) {
          const lot = await tx.stockLot.findFirst({
            where: { productId: item.productId, clinicId },
            orderBy: { createdAt: 'desc' },
          });
          if (lot) targets.push({ lotId: lot.id, qty: effectiveQuantity });
        }

        for (const t of targets) {
          if (remaining <= 0) break;
          const add = Math.min(t.qty, remaining);
          await tx.stockLot.update({
            where: { id: t.lotId },
            data: { quantity: { increment: add } },
          });
          await tx.stockMovement.create({
            data: {
              clinicId,
              productId: item.productId,
              lotId: t.lotId,
              type: StockMovementType.IN,
              quantity: add,
              reason: `Cancelamento RMA-${occurrence.number} - estoque devolvido`,
              occurrenceId: occurrence.id,
            },
          });
          remaining -= add;
        }
      }

      // Se o pedido tinha sido pausado pela avaria, tira da espera de reposição
      if (occurrence.orderId) {
        const order = await tx.order.findUnique({
          where: { id: occurrence.orderId },
        });
        if (order?.status === 'AGUARDANDO_REPOSICAO') {
          await tx.order.update({
            where: { id: occurrence.orderId },
            data: { status: 'PAGO' },
          });
        }
      }
    });
  }

  private async processReportedStatus(
    clinicId: string,
    occurrence: any,
    userId?: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      for (const item of occurrence.items) {
        // Find lot or available lots to decr
        const lots = await tx.stockLot.findMany({
          where: {
            productId: item.productId,
            clinicId,
            ...(item.lotId ? { id: item.lotId } : {}),
            quantity: { gt: 0 },
          },
          orderBy: { expirationDate: 'asc' },
        });

        let effectiveQuantity = item.quantity;
        if (item.unitType === 'UNIDADE') {
          const productData = await tx.product.findUnique({
            where: { id: item.productId },
          });
          if (
            productData &&
            productData.piecesPerBox &&
            productData.piecesPerBox > 0
          ) {
            effectiveQuantity = item.quantity / productData.piecesPerBox;
          }
        }

        let remaining = effectiveQuantity;
        for (const lot of lots) {
          if (remaining <= 0) break;
          const deductAmount = Math.min(lot.quantity, remaining);

          await tx.stockLot.update({
            where: { id: lot.id },
            data: { quantity: { decrement: deductAmount } },
          });

          await tx.stockMovement.create({
            data: {
              clinicId,
              productId: item.productId,
              lotId: lot.id,
              type: StockMovementType.AVARIA,
              quantity: -deductAmount,
              reason: `Avaria reportada RMA-${occurrence.number} - Motivo: ${item.reason || 'Não especificado'}`,
              occurrenceId: occurrence.id,
            },
          });

          remaining -= deductAmount;
        }

        if (remaining > 0) {
          throw new BadRequestException(
            `Estoque insuficiente para registrar a avaria do produto ${item.productId}`,
          );
        }
      }

      // Sync with Order: if this occurrence is linked to an order, pause its fulfillment
      if (occurrence.orderId) {
        await tx.order.update({
          where: { id: occurrence.orderId },
          data: { status: 'AGUARDANDO_REPOSICAO' },
        });
      }
    });
  }

  private async processResolvedStatus(
    clinicId: string,
    occurrence: any,
    allocateToOrder?: boolean,
    userId?: string,
  ) {
    if (
      occurrence.type === OccurrenceType.RECEBIMENTO ||
      occurrence.type === OccurrenceType.DEFEITO
    ) {
      await this.prisma.$transaction(async (tx) => {
        for (const item of occurrence.items) {
          let effectiveQuantity = item.quantity;
          if (item.unitType === 'UNIDADE') {
            const productData = await tx.product.findUnique({
              where: { id: item.productId },
            });
            if (
              productData &&
              productData.piecesPerBox &&
              productData.piecesPerBox > 0
            ) {
              effectiveQuantity = item.quantity / productData.piecesPerBox;
            }
          }

          let lotId = item.lotId;

          if (!lotId) {
            let lot = await tx.stockLot.findFirst({
              where: { productId: item.productId, clinicId },
              orderBy: { createdAt: 'desc' },
            });
            if (!lot) {
              lot = await tx.stockLot.create({
                data: {
                  clinicId,
                  productId: item.productId,
                  lotNumber: 'REPOSICAO-RMA-' + occurrence.number,
                  quantity: 0,
                },
              });
            }
            lotId = lot.id;
          }

          await tx.stockLot.update({
            where: { id: lotId },
            data: { quantity: { increment: effectiveQuantity } },
          });

          await tx.stockMovement.create({
            data: {
              clinicId,
              productId: item.productId,
              lotId: lotId,
              type: StockMovementType.IN,
              quantity: effectiveQuantity,
              reason: `Reposição de Avaria Resolvida RMA-${occurrence.number}`,
              occurrenceId: occurrence.id,
            },
          });

          // Order Allocation
          if (allocateToOrder && occurrence.orderId) {
            try {
              const orderItem = await tx.orderItem.findFirst({
                where: {
                  orderId: occurrence.orderId,
                  productId: item.productId,
                },
              });

              if (orderItem) {
                // Create a reservation for the newly arrived box to the order
                await tx.stockReservation.create({
                  data: {
                    clinicId,
                    productId: item.productId,
                    lotId: lotId,
                    orderId: occurrence.orderId,
                    orderItemId: orderItem.id,
                    quantity: effectiveQuantity,
                    type: 'PEDIDO',
                    status: 'ACTIVE',
                    expiresAt: new Date(
                      new Date().setFullYear(new Date().getFullYear() + 10),
                    ), // Long lived reservation
                  },
                });
              }
            } catch (err) {
              console.error('Failed to auto-allocate RMA item to Order:', err);
            }
          }
        }

        // Unfreeze the Order
        if (allocateToOrder && occurrence.orderId) {
          await tx.order.update({
            where: { id: occurrence.orderId },
            data: { status: 'PRONTO_PARA_RETIRA' },
          });
        }
      });
    }
  }
}
