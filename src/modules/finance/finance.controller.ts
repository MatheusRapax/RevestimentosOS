import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    UseGuards,
    Request,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';

import { ModuleGuard } from '../../core/auth/guards/module.guard';
import { RequireModules } from '../../core/auth/decorators/module.decorator';

@Controller('finance')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, ModuleGuard)
@RequireModules('FINANCE')
export class FinanceController {
    constructor(private readonly financeService: FinanceService) { }

    /**
     * GET /finance/patients/:patientId/account
     * Get patient account with transactions
     */
    @Get('patients/:patientId/account')
    @Permissions(PERMISSIONS.FINANCE_READ)
    getPatientAccount(@Request() req: any, @Param('patientId') patientId: string) {
        return this.financeService.getPatientAccount(req.clinicId, patientId);
    }

    /**
     * POST /finance/patients/:patientId/charge
     * Create a charge for patient
     */
    @Post('patients/:patientId/charge')
    @Permissions(PERMISSIONS.FINANCE_CHARGE)
    createCharge(
        @Request() req: any,
        @Param('patientId') patientId: string,
        @Body() body: { amountCents: number; description: string },
    ) {
        return this.financeService.createCharge(
            req.clinicId,
            patientId,
            body.amountCents,
            body.description,
            undefined,
            req.user?.id,
        );
    }

    /**
     * POST /finance/patients/:patientId/payment
     * Register a payment from patient
     */
    @Post('patients/:patientId/payment')
    @Permissions(PERMISSIONS.FINANCE_PAYMENT)
    createPayment(
        @Request() req: any,
        @Param('patientId') patientId: string,
        @Body() body: { amountCents: number; description: string },
    ) {
        return this.financeService.createPayment(
            req.clinicId,
            patientId,
            body.amountCents,
            body.description,
            req.user?.id,
        );
    }

    /**
     * GET /finance/encounters/:encounterId/total
     * Calculate encounter total
     */
    @Get('encounters/:encounterId/total')
    @Permissions(PERMISSIONS.FINANCE_READ)
    calculateEncounterTotal(@Param('encounterId') encounterId: string) {
        return this.financeService.calculateEncounterTotal(encounterId);
    }

    /**
     * POST /finance/encounters/:encounterId/charge
     * Charge encounter to patient account
     */
    @Post('encounters/:encounterId/charge')
    @Permissions(PERMISSIONS.FINANCE_CHARGE)
    chargeEncounter(@Request() req: any, @Param('encounterId') encounterId: string) {
        return this.financeService.chargeEncounter(req.clinicId, encounterId, req.user?.id);
    }

    /**
     * POST /finance/patients/:patientId/register-payment
     * Register a payment with method (PIX, CARD, etc)
     */
    @Post('patients/:patientId/register-payment')
    @Permissions(PERMISSIONS.FINANCE_PAYMENT)
    registerPayment(
        @Request() req: any,
        @Param('patientId') patientId: string,
        @Body() body: {
            amountCents: number;
            method: string;
            description?: string;
            installments?: number;
        },
    ) {
        return this.financeService.registerPayment(
            req.clinicId,
            patientId,
            body.amountCents,
            body.method,
            body.description,
            body.installments || 1,
            req.user?.id,
        );
    }

    /**
     * GET /finance/patients/:patientId/payments
     * List payments for a patient
     */
    @Get('patients/:patientId/payments')
    @Permissions(PERMISSIONS.FINANCE_READ)
    listPayments(@Request() req: any, @Param('patientId') patientId: string) {
        return this.financeService.listPayments(req.clinicId, patientId);
    }


    // =====================================================
    // BOLETOS / INVOICES (ERP Revestimentos)
    // =====================================================

    @Post('invoices')
    @Permissions(PERMISSIONS.FINANCE_CHARGE)
    async generateInvoice(
        @Request() req: any,
        @Body() body: { orderId: string; dueDate: string }
    ) {
        return this.financeService.generateInvoice(req.clinicId, body.orderId, body.dueDate);
    }

    @Get('orders/:orderId/invoices')
    @Permissions(PERMISSIONS.FINANCE_READ)
    async listInvoices(
        @Request() req: any,
        @Param('orderId') orderId: string
    ) {
        return this.financeService.listInvoices(req.clinicId, orderId);
    }

    @Patch('invoices/:id/status')
    @Permissions(PERMISSIONS.FINANCE_PAYMENT)
    async updateStatus(
        @Request() req: any,
        @Param('id') id: string,
        @Body() body: { status: 'PAID' | 'CANCELLED' }
    ) {
        return this.financeService.updateInvoiceStatus(req.clinicId, id, body.status);
    }
}

