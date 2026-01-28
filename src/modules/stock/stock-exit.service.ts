import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ExitStatus, StockMovementType, ExitType } from '@prisma/client';

export class CreateStockExitDto {
    type?: ExitType;
    destinationType?: string;
    destinationName?: string;
    notes?: string;
}

export class AddStockExitItemDto {
    productId: string;
    quantity: number;
    lotId?: string; // Optional specific lot
}

@Injectable()
export class StockExitService {
    constructor(private prisma: PrismaService) { }

    async createDraft(clinicId: string, dto: CreateStockExitDto, userId: string) {
        return this.prisma.stockExit.create({
            data: {
                clinicId,
                status: ExitStatus.DRAFT,
                type: dto.type || ExitType.SECTOR_REQUEST,
                destinationType: dto.destinationType,
                destinationName: dto.destinationName,
                requestedBy: userId, // Assuming ID or Name
                notes: dto.notes,
            },
        });
    }

    async addItem(clinicId: string, exitId: string, dto: AddStockExitItemDto) {
        const exit = await this.prisma.stockExit.findUnique({
            where: { id: exitId, clinicId },
        });

        if (!exit || exit.status !== ExitStatus.DRAFT) throw new BadRequestException('Saída inválida');

        // Check stock availability (simple check)
        const product = await this.prisma.product.findUnique({
            where: { id: dto.productId },
            include: { lots: true }
        });

        const totalStock = product?.lots.reduce((acc, lot) => acc + lot.quantity, 0) || 0;
        if (totalStock < dto.quantity) throw new BadRequestException(`Estoque insuficiente. Disponível: ${totalStock}`);

        return this.prisma.stockExitItem.create({
            data: {
                stockExitId: exit.id,
                productId: dto.productId,
                quantity: dto.quantity,
                lotId: dto.lotId,
            },
        });
    }

    async removeItem(clinicId: string, exitId: string, itemId: string) {
        const exit = await this.prisma.stockExit.findUnique({ where: { id: exitId, clinicId } });
        if (!exit || exit.status !== ExitStatus.DRAFT) throw new BadRequestException('Ação inválida');
        await this.prisma.stockExitItem.delete({ where: { id: itemId } });
    }

    async getExit(clinicId: string, exitId: string) {
        const exit = await this.prisma.stockExit.findUnique({
            where: { id: exitId, clinicId },
            include: {
                items: {
                    include: { product: true, lot: true }
                }
            }
        });
        if (!exit) throw new NotFoundException('Saída não encontrada');
        return exit;
    }

    async listExits(clinicId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [data, total] = await this.prisma.$transaction([
            this.prisma.stockExit.findMany({
                where: { clinicId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: { _count: { select: { items: true } } }
            }),
            this.prisma.stockExit.count({ where: { clinicId } }),
        ]);

        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
        };
    }

    // === CRITICAL: CONFIRM EXIT TRANSACTION ===
    async confirmExit(clinicId: string, exitId: string, userId: string) {
        const exit = await this.prisma.stockExit.findUnique({
            where: { id: exitId, clinicId },
            include: { items: true },
        });

        if (!exit) throw new NotFoundException('Saída não encontrada');
        if (exit.status !== ExitStatus.DRAFT) throw new BadRequestException('Saída não está em rascunho');
        if (exit.items.length === 0) throw new BadRequestException('Saída vazia');

        return this.prisma.$transaction(async (tx) => {
            // 1. Mark Exit as CONFIRMED
            const confirmedExit = await tx.stockExit.update({
                where: { id: exitId },
                data: {
                    status: ExitStatus.CONFIRMED,
                    confirmedAt: new Date(),
                    approvedBy: userId,
                },
            });

            // 2. Process each item (FIFO mostly)
            for (const item of exit.items) {
                let remainingQty = item.quantity;

                // Fetch candidate lots (FIF0: ordered by expirationDate ASC)
                // If item has specific lotId, strict filter.
                const whereLots = {
                    clinicId,
                    productId: item.productId,
                    quantity: { gt: 0 },
                    ...(item.lotId ? { id: item.lotId } : {})
                };

                const lots = await tx.stockLot.findMany({
                    where: whereLots,
                    orderBy: { expirationDate: 'asc' },
                });

                const totalAvailable = lots.reduce((acc, l) => acc + l.quantity, 0);
                if (totalAvailable < remainingQty) {
                    throw new BadRequestException(`Estoque insuficiente para item ${item.productId}`);
                }

                // Deduct from lots
                for (const lot of lots) {
                    if (remainingQty <= 0) break;

                    const deduct = Math.min(lot.quantity, remainingQty);

                    await tx.stockLot.update({
                        where: { id: lot.id },
                        data: { quantity: { decrement: deduct } }
                    });

                    // Create Movement
                    await tx.stockMovement.create({
                        data: {
                            clinicId,
                            productId: item.productId,
                            type: StockMovementType.OUT,
                            quantity: deduct,
                            lotId: lot.id,
                            destinationType: exit.destinationType,
                            destinationName: exit.destinationName,
                            encounterId: exit.encounterId,
                            reason: `Saída: ${exit.type} - Destino: ${exit.destinationName || 'N/A'}`,
                        }
                    });

                    remainingQty -= deduct;
                }
            }

            return confirmedExit;
        });
    }

    async cancelExit(clinicId: string, exitId: string) {
        const exit = await this.prisma.stockExit.findUnique({ where: { id: exitId, clinicId } });
        if (!exit || exit.status !== ExitStatus.DRAFT) throw new BadRequestException('Apenas rascunhos podem ser cancelados.');

        return this.prisma.stockExit.update({
            where: { id: exitId },
            data: { status: ExitStatus.REJECTED },
        });
    }
}
