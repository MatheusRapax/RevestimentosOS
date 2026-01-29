import { Controller, Get, Post, Patch, Body, Param, Request, Query, UseGuards } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';

@Controller('expenses')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ExpensesController {
    constructor(private readonly expensesService: ExpensesService) { }

    @Post()
    async create(@Request() req: any, @Body() body: any) {
        return this.expensesService.createExpense(req.clinicId, body);
    }

    @Get()
    async list(@Request() req: any, @Query('status') status?: 'PENDING' | 'PAID' | 'OVERDUE') {
        return this.expensesService.listExpenses(req.clinicId, { status });
    }

    @Get('dashboard')
    async getDashboard(@Request() req: any) {
        return this.expensesService.getDashboardMetrics(req.clinicId);
    }

    @Patch(':id/pay')
    async pay(@Request() req: any, @Param('id') id: string) {
        return this.expensesService.markAsPaid(req.clinicId, id);
    }
}
