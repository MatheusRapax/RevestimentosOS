import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';

@Injectable()
export class PurchaseOrdersService {
    constructor(private prisma: PrismaService) { }

    async findAll(clinicId: string, filters?: { status?: string; supplierId?: string }) {
        const where: any = { clinicId };

        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.supplierId) {
            where.supplierId = filters.supplierId;
        }

        return this.prisma.purchaseOrder.findMany({
            where,
            include: {
                supplier: true,
                items: {
                    include: {
                        product: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(clinicId: string, id: string) {
        const order = await this.prisma.purchaseOrder.findFirst({
            where: { id, clinicId },
            include: {
                supplier: true,
                salesOrder: true,
                items: {
                    include: {
                        product: true,
                    },
                },
                expenses: true,
            },
        });

        if (!order) {
            throw new NotFoundException('Pedido de compra não encontrado');
        }

        return order;
    }

    async create(clinicId: string, data: {
        supplierId?: string;
        supplierName: string;
        supplierCnpj?: string;
        supplierEmail?: string;
        supplierPhone?: string;
        salesOrderId?: string;
        expectedDate?: string;
        notes?: string;
        subtotalCents: number;
        shippingCents?: number;
        totalCents: number;
        items: Array<{
            productId: string;
            productCode?: string;
            productName?: string;
            quantity: number;
            unitPriceCents: number;
            totalCents: number;
        }>;
    }) {
        // Get next number
        const lastOrder = await this.prisma.purchaseOrder.findFirst({
            where: { clinicId },
            orderBy: { number: 'desc' },
        });
        const nextNumber = (lastOrder?.number || 0) + 1;

        // Fetch product info for items that need it
        const productIds = data.items.map(i => i.productId).filter(Boolean);
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, sku: true, name: true },
        });
        const productMap = new Map(products.map(p => [p.id, p]));

        return this.prisma.purchaseOrder.create({
            data: {
                clinicId,
                number: nextNumber,
                supplierId: data.supplierId,
                supplierName: data.supplierName,
                supplierCnpj: data.supplierCnpj,
                supplierEmail: data.supplierEmail,
                supplierPhone: data.supplierPhone,
                salesOrderId: data.salesOrderId,
                expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
                notes: data.notes,
                subtotalCents: data.subtotalCents,
                shippingCents: data.shippingCents || 0,
                totalCents: data.totalCents,
                items: {
                    create: data.items.map(item => {
                        const product = productMap.get(item.productId);
                        return {
                            productId: item.productId,
                            productCode: item.productCode || product?.sku || 'N/A',
                            productName: item.productName || product?.name || 'Produto',
                            quantityOrdered: item.quantity,
                            unitPriceCents: item.unitPriceCents,
                            totalCents: item.totalCents,
                        };
                    }),
                },
            },
            include: {
                items: { include: { product: true } },
            },
        });
    }

    async updateStatus(clinicId: string, id: string, status: string) {
        const order = await this.findOne(clinicId, id);

        const updateData: any = { status };
        if (status === 'RECEIVED') {
            updateData.receivedAt = new Date();
        }

        return this.prisma.purchaseOrder.update({
            where: { id: order.id },
            data: updateData,
        });
    }

    async update(clinicId: string, id: string, data: {
        supplierId?: string;
        supplierName: string;
        supplierCnpj?: string;
        supplierEmail?: string;
        supplierPhone?: string;
        salesOrderId?: string;
        expectedDate?: string;
        notes?: string;
        subtotalCents: number;
        shippingCents?: number;
        totalCents: number;
        items: Array<{
            productId: string;
            productCode?: string;
            productName?: string;
            quantity: number;
            unitPriceCents: number;
            totalCents: number;
        }>;
    }) {
        const order = await this.findOne(clinicId, id);

        if (!['DRAFT', 'SENT'].includes(order.status)) {
            throw new Error('Só é possível editar pedidos em Rascunho ou Enviados');
        }

        // Fetch product info
        const productIds = data.items.map(i => i.productId).filter(Boolean);
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, sku: true, name: true },
        });
        const productMap = new Map(products.map(p => [p.id, p]));

        // Transaction: Delete Items -> Update Order -> Create Items
        return this.prisma.$transaction(async (tx) => {
            // Delete existing items
            await tx.purchaseOrderItem.deleteMany({
                where: { purchaseOrderId: id }
            });

            // Update Order and Create New Items
            return tx.purchaseOrder.update({
                where: { id },
                data: {
                    supplierId: data.supplierId,
                    supplierName: data.supplierName,
                    supplierCnpj: data.supplierCnpj,
                    supplierEmail: data.supplierEmail,
                    supplierPhone: data.supplierPhone,
                    salesOrderId: data.salesOrderId,
                    expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
                    notes: data.notes,
                    subtotalCents: data.subtotalCents,
                    shippingCents: data.shippingCents || 0,
                    totalCents: data.totalCents,
                    items: {
                        create: data.items.map(item => {
                            const product = productMap.get(item.productId);
                            return {
                                productId: item.productId,
                                productCode: item.productCode || product?.sku || 'N/A',
                                productName: item.productName || product?.name || 'Produto',
                                quantityOrdered: item.quantity,
                                unitPriceCents: item.unitPriceCents,
                                totalCents: item.totalCents,
                            };
                        }),
                    },
                },
                include: {
                    items: { include: { product: true } },
                },
            });
        });
    }

    async delete(clinicId: string, id: string) {
        const order = await this.findOne(clinicId, id);

        if (order.status !== 'DRAFT') {
            throw new Error('Só é possível excluir pedidos em rascunho');
        }

        await this.prisma.purchaseOrderItem.deleteMany({
            where: { purchaseOrderId: order.id },
        });

        return this.prisma.purchaseOrder.delete({
            where: { id: order.id },
        });
    }
}
