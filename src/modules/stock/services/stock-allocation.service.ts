import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuditService } from '../../../core/audit/audit.service';
import { FulfillmentStatus, OrderStatus, AuditAction } from '@prisma/client';

@Injectable()
export class StockAllocationService {
    private readonly logger = new Logger(StockAllocationService.name);

    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
    ) { }

    /**
     * Automatically attempts to allocate stock for a given order.
     * Enforces single-lot rule unless explicitly overridden (future).
     */
    async autoAllocateOrder(clinicId: string, orderId: string, userId?: string) {
        this.logger.log(`Starting auto-allocation for order ${orderId}`);

        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                purchaseOrders: true, // Include linked POs to determine waiting status
                items: {
                    include: {
                        product: { include: { lots: { where: { quantity: { gt: 0 } }, orderBy: { expirationDate: 'asc' } } } },
                    },
                },
            },
        });

        if (!order) throw new Error('Order not found');

        // Fetch ALL active reservations for this order (handles both quote-migrated and new)
        const existingReservations = await this.prisma.stockReservation.findMany({
            where: { orderId, status: 'ACTIVE' },
            include: { lot: true },
        });

        // Group reservations by productId (with fallback to lot.productId for legacy data)
        const reservationsByProduct = new Map<string, typeof existingReservations>();
        for (const res of existingReservations) {
            const prodId = res.productId || res.lot?.productId;
            if (!prodId) continue;
            if (!reservationsByProduct.has(prodId)) reservationsByProduct.set(prodId, []);
            reservationsByProduct.get(prodId)!.push(res);
        }

        let allReserved = true;
        let someReserved = false;
        let hasMixedLotIssue = false;

        for (const item of order.items) {
            // Use robust lookup: reservations grouped by productId
            const itemReservations = reservationsByProduct.get(item.productId) || [];
            const reservedQty = itemReservations.reduce((sum, res) => sum + res.quantity, 0);
            const neededQty = item.quantityBoxes - reservedQty;

            if (neededQty <= 0) {
                someReserved = true;
                continue;
            }

            // Strategy: Find ONE lot with enough quantity (Lot Integrity Rule)
            const lots = item.product.lots;
            const suitableLot = lots.find(lot => lot.quantity >= neededQty);

            if (suitableLot) {
                await this.prisma.stockReservation.create({
                    data: {
                        clinicId,
                        orderId,
                        orderItemId: item.id,
                        lotId: suitableLot.id,
                        productId: item.productId,
                        quantity: neededQty,
                        status: 'ACTIVE',
                        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    },
                });

                someReserved = true;

                await this.auditService.log({
                    clinicId,
                    action: AuditAction.CREATE,
                    entity: 'StockReservation',
                    entityId: orderId,
                    message: `Auto-reserved ${neededQty} from Lot ${suitableLot.lotNumber} for Item ${item.product.name}`,
                    userId,
                });
            } else {
                const totalAvailable = lots.reduce((sum, lot) => sum + lot.quantity, 0);
                if (totalAvailable >= neededQty) {
                    hasMixedLotIssue = true;
                    allReserved = false;
                    this.logger.warn(`Order ${orderId}: Item ${item.product.name} needs ${neededQty} but no single lot has enough. Total available: ${totalAvailable}. Skipping (Lot Integrity Rule).`);
                } else {
                    allReserved = false;
                    this.logger.warn(`Order ${orderId}: Item ${item.product.name} insufficient stock.`);
                }
            }
        }

        // Determine Fulfillment Status
        let newStatus: FulfillmentStatus = FulfillmentStatus.PENDING;

        if (allReserved && order.items.length > 0) {
            newStatus = FulfillmentStatus.IN_PICKING;
        } else if (someReserved) {
            newStatus = FulfillmentStatus.PARTIALLY_FULFILLED;
        } else if (hasMixedLotIssue) {
            newStatus = FulfillmentStatus.AWAITING_PICKING;
        } else {
            newStatus = FulfillmentStatus.AWAITING_STOCK;
        }

        await this.prisma.order.update({
            where: { id: orderId },
            data: { fulfillmentStatus: newStatus },
        });

        if (order.status === OrderStatus.PAGO) {
            let nextOrderStatus: OrderStatus | undefined;

            if (newStatus === FulfillmentStatus.IN_PICKING) {
                // Scenario A: Full Stock
                nextOrderStatus = OrderStatus.EM_SEPARACAO;
            } else {
                // Scenario B/C: Insufficient Stock
                // Check if there are linked Purchase Orders
                const hasActivePO = order.purchaseOrders && order.purchaseOrders.some(po =>
                    po.status !== 'CANCELLED' && po.status !== 'RECEIVED'
                );

                if (hasActivePO) {
                    // Scenario B: Waiting for Arrival
                    // Verify if AGUARDANDO_CHEGADA exists in enum, fallback to AGUARDANDO_MATERIAL
                    nextOrderStatus = 'AGUARDANDO_CHEGADA' as OrderStatus;
                } else {
                    // Scenario C: Need to Buy
                    nextOrderStatus = OrderStatus.AGUARDANDO_MATERIAL;
                }
            }

            if (nextOrderStatus) {
                await this.prisma.order.update({
                    where: { id: orderId },
                    data: { status: nextOrderStatus },
                });
                this.logger.log(`Auto-updated order ${orderId} status to ${nextOrderStatus}`);
            }
        }

        await this.auditService.log({
            clinicId,
            action: AuditAction.UPDATE,
            entity: 'Order',
            entityId: orderId,
            message: `Auto-allocation result: ${newStatus}`,
            userId,
        });

        return { success: true, status: newStatus };
    }

    /**
     * Process stock arrival for specific products.
     * Finds pending orders and attempts allocation.
     */
    async processStockArrival(clinicId: string, productIds: string[], userId?: string) {
        if (!productIds || productIds.length === 0) return;

        // Find orders that contain any of these products AND are waiting for stock
        const orders = await this.prisma.order.findMany({
            where: {
                clinicId,
                status: {
                    in: [
                        OrderStatus.PAGO,
                        OrderStatus.AGUARDANDO_COMPRA,
                        OrderStatus.AGUARDANDO_CHEGADA,
                        OrderStatus.AGUARDANDO_MATERIAL // Include legacy/deprecated just in case
                    ]
                },
                fulfillmentStatus: {
                    in: [
                        FulfillmentStatus.AWAITING_STOCK,
                        FulfillmentStatus.AWAITING_PICKING,
                        FulfillmentStatus.PENDING,
                        FulfillmentStatus.PARTIALLY_FULFILLED
                    ]
                },
                items: {
                    some: {
                        productId: { in: productIds }
                    }
                }
            },
            orderBy: { confirmedAt: 'asc' } // FIFO allocation based on payment date
        });

        this.logger.log(`Stock Arrival: Found ${orders.length} orders waiting for products ${productIds.join(', ')}`);

        for (const order of orders) {
            try {
                await this.autoAllocateOrder(clinicId, order.id, userId);
            } catch (error) {
                this.logger.error(`Failed to auto-allocate order ${order.id} on stock arrival`, error);
            }
        }
    }
}
