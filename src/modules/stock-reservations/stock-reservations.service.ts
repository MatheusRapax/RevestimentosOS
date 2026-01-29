import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
// import { addDays } from 'date-fns';

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

@Injectable()
export class StockReservationsService {
    constructor(private prisma: PrismaService) { }

    async create(clinicId: string, data: {
        orderId?: string;
        quoteId?: string;
        lotId: string;
        quantity: number;
    }) {
        // Verificar se tem estoque disponível (física - reservada)
        const lot = await this.prisma.stockLot.findUnique({
            where: { id: data.lotId },
            include: { reservations: { where: { status: 'ACTIVE' } } },
        });

        if (!lot) {
            throw new BadRequestException('Lote não encontrado');
        }

        const reservedQuantity = lot.reservations.reduce((sum: number, r: any) => sum + r.quantity, 0);
        const availableQuantity = lot.quantity - reservedQuantity;

        if (data.quantity > availableQuantity) {
            throw new BadRequestException('Quantidade indisponível para reserva neste lote');
        }

        return this.prisma.stockReservation.create({
            data: {
                clinicId,
                lotId: data.lotId,
                orderId: data.orderId,
                quoteId: data.quoteId,
                quantity: data.quantity,
                status: 'ACTIVE',
                expiresAt: addDays(new Date(), 30), // Expira em 30 dias
            },
        });
    }

    async findByQuote(clinicId: string, quoteId: string) {
        return this.prisma.stockReservation.findMany({
            where: { clinicId, quoteId, status: 'ACTIVE' },
            include: { lot: { include: { product: true } } },
        });
    }

    async cancel(clinicId: string, id: string) {
        return this.prisma.stockReservation.update({
            where: { id, clinicId },
            data: { status: 'CANCELLED' },
        });
    }

    // Cron job (pode ser chamado via endpoint por enquanto)
    async expireOldReservations(clinicId: string) {
        const now = new Date();
        return this.prisma.stockReservation.updateMany({
            where: {
                clinicId,
                status: 'ACTIVE',
                expiresAt: { lt: now },
            },
            data: { status: 'EXPIRED' },
        });
    }
}
