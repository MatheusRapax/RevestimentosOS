import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../../modules/stock/stock.service';
import { EncounterStatus } from '@prisma/client';

interface ConsumeFromUsageData {
    clinicId: string;
    productId: string;
    quantity: number;
    encounterId: string;
    reason?: string;
}

@Injectable()
export class StockConsumptionService {
    constructor(
        private prisma: PrismaService,
        private stockService: StockService,
    ) { }

    /**
     * Consume stock from a business event (e.g., consumable usage in encounter)
     * Orchestrates stock deduction by reusing existing FIFO logic
     */
    async consumeFromUsage(data: ConsumeFromUsageData): Promise<void> {
        const { clinicId, productId, quantity, encounterId, reason } = data;

        // Validate quantity
        if (quantity <= 0) {
            throw new BadRequestException('Quantidade deve ser maior que zero');
        }

        // Validate encounter exists and is OPEN
        const encounter = await this.prisma.encounter.findFirst({
            where: { id: encounterId, clinicId },
        });

        if (!encounter) {
            throw new NotFoundException('Atendimento não encontrado');
        }

        if (encounter.status === EncounterStatus.CLOSED) {
            throw new ForbiddenException(
                'Não é possível adicionar consumíveis a um atendimento fechado',
            );
        }

        // Validate product exists and is active
        const product = await this.prisma.product.findFirst({
            where: {
                id: productId,
                clinicId,
                isActive: true,
            },
        });

        if (!product) {
            throw new NotFoundException('Produto não encontrado ou inativo');
        }

        // Reuse existing FIFO logic from StockService
        // This will:
        // - Find lots ordered by expirationDate (FIFO)
        // - Deduct stock using transaction
        // - Create StockMovement (OUT)
        // - Throw error if insufficient stock
        await this.stockService.removeStock(clinicId, {
            productId,
            quantity,
            reason: reason || `Uso em atendimento ${encounterId}`,
        });
    }
}
