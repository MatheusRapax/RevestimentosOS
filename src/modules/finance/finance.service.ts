import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { AuditAction, TransactionType } from '@prisma/client';

@Injectable()
export class FinanceService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
    ) { }

    /**
     * Get or create patient/customer account
     */
    async getOrCreateAccount(clinicId: string, patientId?: string | null, customerId?: string | null) {
        if (!patientId && !customerId) {
            throw new BadRequestException('ID do Paciente ou Cliente é obrigatório');
        }

        let account;

        if (patientId) {
            account = await this.prisma.patientAccount.findUnique({
                where: { patientId },
            });
        } else if (customerId) {
            account = await this.prisma.patientAccount.findUnique({
                where: { customerId },
            });
        }

        if (!account) {
            account = await this.prisma.patientAccount.create({
                data: {
                    clinicId,
                    patientId: patientId || undefined,
                    customerId: customerId || undefined
                },
            });
        }

        return account;
    }

    /**
     * Get patient account with transactions
     */
    async getPatientAccount(clinicId: string, patientId: string) {
        // Validate patient belongs to clinic
        const patient = await this.prisma.patient.findFirst({
            where: { id: patientId, clinicId },
        });

        if (!patient) {
            throw new NotFoundException('Paciente não encontrado');
        }

        const account = await this.getOrCreateAccount(clinicId, patientId);

        const transactions = await this.prisma.transaction.findMany({
            where: { accountId: account.id },
            include: {
                encounter: {
                    select: { id: true, date: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        return {
            patientId,
            patientName: patient.name,
            balanceCents: account.balanceCents,
            balanceFormatted: this.formatCurrency(account.balanceCents),
            transactions: transactions.map(t => ({
                id: t.id,
                type: t.type,
                amountCents: t.amountCents,
                amountFormatted: this.formatCurrency(t.amountCents),
                description: t.description,
                encounterId: t.encounterId,
                encounterDate: t.encounter?.date,
                createdAt: t.createdAt,
            })),
        };
    }

    /**
     * Create a charge transaction (débito)
     */
    async createCharge(
        clinicId: string,
        patientId: string,
        amountCents: number,
        description: string,
        encounterId?: string,
        userId?: string,
    ) {
        if (amountCents <= 0) {
            throw new BadRequestException('Valor deve ser positivo');
        }

        const account = await this.getOrCreateAccount(clinicId, patientId);

        // Create transaction
        const transaction = await this.prisma.transaction.create({
            data: {
                clinicId,
                patientId,
                accountId: account.id,
                encounterId,
                type: TransactionType.CHARGE,
                amountCents,
                description,
            },
        });

        // Update account balance (charge = negative)
        await this.prisma.patientAccount.update({
            where: { id: account.id },
            data: { balanceCents: account.balanceCents - amountCents },
        });

        await this.auditService.log({
            clinicId,
            userId,
            action: AuditAction.CREATE,
            entity: 'Transaction',
            entityId: transaction.id,
            message: `Cobrança: ${this.formatCurrency(amountCents)}`,
        });

        return transaction;
    }

    /**
     * Create a payment transaction (crédito)
     */
    async createPayment(
        clinicId: string,
        patientId: string,
        amountCents: number,
        description: string,
        userId?: string,
    ) {
        if (amountCents <= 0) {
            throw new BadRequestException('Valor deve ser positivo');
        }

        const account = await this.getOrCreateAccount(clinicId, patientId);

        // Create transaction
        const transaction = await this.prisma.transaction.create({
            data: {
                clinicId,
                patientId,
                accountId: account.id,
                type: TransactionType.PAYMENT,
                amountCents,
                description,
            },
        });

        // Update account balance (payment = positive)
        await this.prisma.patientAccount.update({
            where: { id: account.id },
            data: { balanceCents: account.balanceCents + amountCents },
        });

        await this.auditService.log({
            clinicId,
            userId,
            action: AuditAction.CREATE,
            entity: 'Transaction',
            entityId: transaction.id,
            message: `Pagamento: ${this.formatCurrency(amountCents)}`,
        });

        return transaction;
    }

    /**
     * Calculate encounter total (procedures + consumables)
     */
    async calculateEncounterTotal(encounterId: string) {
        const encounter = await this.prisma.encounter.findUnique({
            where: { id: encounterId },
            include: {
                procedures: true,
                consumables: {
                    include: {
                        // Note: consumables don't have product relation in current schema
                        // This will need to be updated when we link them
                    },
                },
            },
        });

        if (!encounter) {
            throw new NotFoundException('Atendimento não encontrado');
        }

        // Sum procedure prices
        const proceduresTotal = encounter.procedures.reduce(
            (sum, p) => sum + (p.priceCents || 0),
            0
        );

        // For now, consumables don't have price - will be added in future
        const consumablesTotal = 0;

        return {
            encounterId,
            proceduresTotal,
            consumablesTotal,
            totalCents: proceduresTotal + consumablesTotal,
            totalFormatted: this.formatCurrency(proceduresTotal + consumablesTotal),
        };
    }

    /**
     * Charge encounter to patient account
     */
    async chargeEncounter(clinicId: string, encounterId: string, userId?: string) {
        const encounter = await this.prisma.encounter.findFirst({
            where: { id: encounterId, clinicId },
        });

        if (!encounter) {
            throw new NotFoundException('Atendimento não encontrado');
        }

        const total = await this.calculateEncounterTotal(encounterId);

        if (total.totalCents <= 0) {
            return { message: 'Nenhum valor a cobrar', totalCents: 0 };
        }

        const transaction = await this.createCharge(
            clinicId,
            encounter.patientId,
            total.totalCents,
            `Atendimento ${encounter.date}`,
            encounterId,
            userId,
        );

        return {
            message: 'Cobrança realizada',
            totalCents: total.totalCents,
            transactionId: transaction.id,
        };
    }

    /**
     * Register a payment with method and create transaction
     */
    async registerPayment(
        clinicId: string,
        patientId: string | null | undefined,
        amountCents: number,
        method: string,
        description?: string,
        installments = 1,
        userId?: string,
        customerId?: string,
    ) {
        if (amountCents <= 0) {
            throw new BadRequestException('Valor deve ser positivo');
        }

        const account = await this.getOrCreateAccount(clinicId, patientId, customerId);

        // Create payment record
        const payment = await this.prisma.payment.create({
            data: {
                clinicId,
                patientId: patientId || undefined,
                customerId: customerId || undefined,
                amountCents,
                method: method as any,
                status: 'APPROVED',
                installments,
                paidAt: new Date(),
            },
        });

        // Create transaction linked to payment
        const transaction = await this.prisma.transaction.create({
            data: {
                clinicId,
                patientId: patientId || undefined,
                customerId: customerId || undefined,
                accountId: account.id,
                paymentId: payment.id,
                type: TransactionType.PAYMENT,
                amountCents,
                description: description || `Pagamento ${method}`,
            },
        });

        // Update account balance
        await this.prisma.patientAccount.update({
            where: { id: account.id },
            data: { balanceCents: account.balanceCents + amountCents },
        });

        await this.auditService.log({
            clinicId,
            userId,
            action: AuditAction.CREATE,
            entity: 'Payment',
            entityId: payment.id,
            message: `Pagamento: ${this.formatCurrency(amountCents)} via ${method}`,
        });

        return {
            payment,
            transaction,
            newBalance: account.balanceCents + amountCents,
        };
    }

    /**
     * List payments for a patient
     */
    async listPayments(clinicId: string, patientId: string) {
        const payments = await this.prisma.payment.findMany({
            where: { clinicId, patientId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        return payments.map(p => ({
            id: p.id,
            amountCents: p.amountCents,
            amountFormatted: this.formatCurrency(p.amountCents),
            method: p.method,
            status: p.status,
            installments: p.installments,
            paidAt: p.paidAt,
            createdAt: p.createdAt,
        }));
    }

    private formatCurrency(cents: number): string {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(cents / 100);
    }

    // =====================================================
    // BOLETOS / INVOICES (ERP Revestimentos)
    // =====================================================

    async generateInvoice(clinicId: string, orderId: string, dueDate: string) {
        // 1. Verify Order
        const order = await this.prisma.order.findUnique({
            where: { id: orderId, clinicId },
            include: { customer: true }
        });

        if (!order) {
            throw new NotFoundException('Pedido não encontrado');
        }

        // 2. Generate Mock Data (Barcode, PDF Link)
        const mockBarcode = `34191.79001 01043.510047 91020.150008 5 ${Math.floor(Date.now() / 1000)}0`;
        const mockPdfUrl = `https://mock-bank.com/boleto/${order.id}.pdf`;

        // 3. Create Invoice
        const invoice = await this.prisma.invoice.create({
            data: {
                clinicId,
                orderId,
                amountCents: order.totalCents,
                dueDate: new Date(dueDate),
                status: 'PENDING',
                barCode: mockBarcode,
                pdfUrl: mockPdfUrl,
                provider: 'INTERNAL_MOCK'
            }
        });

        return invoice;
    }

    async listInvoices(clinicId: string, orderId: string) {
        return this.prisma.invoice.findMany({
            where: { clinicId, orderId },
            orderBy: { createdAt: 'desc' }
        });
    }

    async updateInvoiceStatus(clinicId: string, invoiceId: string, status: 'PAID' | 'CANCELLED') {
        const invoice = await this.prisma.invoice.findFirst({
            where: { id: invoiceId, clinicId }
        });

        if (!invoice) throw new NotFoundException('Boleto não encontrado');

        const updated = await this.prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                status,
                paidAt: status === 'PAID' ? new Date() : null
            }
        });

        return updated;
    }
}
