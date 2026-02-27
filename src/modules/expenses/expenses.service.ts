import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) { }

  async createExpense(
    clinicId: string,
    data: {
      description: string;
      amountCents: number;
      dueDate: string;
      type: 'SUPPLIER' | 'OPERATIONAL' | 'TAX' | 'COMMISSION' | 'OTHER';
      barCode?: string;
      recipientName?: string;
      purchaseOrderId?: string;
    },
  ) {
    // Prevent duplicate expense for same PO
    if (data.purchaseOrderId) {
      const existing = await this.prisma.expense.findFirst({
        where: {
          clinicId,
          purchaseOrderId: data.purchaseOrderId,
        },
      });
      if (existing) {
        throw new BadRequestException(
          'Já existe uma despesa lançada para este Pedido de Compra.',
        );
      }
    }

    return this.prisma.expense.create({
      data: {
        clinicId,
        description: data.description,
        amountCents: data.amountCents,
        dueDate: new Date(data.dueDate),
        type: data.type,
        barCode: data.barCode,
        recipientName: data.recipientName,
        purchaseOrderId: data.purchaseOrderId,
        status: 'PENDING',
      },
    });
  }

  async listExpenses(
    clinicId: string,
    filters?: { status?: 'PENDING' | 'PAID' | 'OVERDUE' },
  ) {
    const whereClause: any = { clinicId };

    if (filters?.status) {
      whereClause.status = filters.status;
    }

    const expenses = await this.prisma.expense.findMany({
      where: whereClause,
      orderBy: { dueDate: 'asc' },
      include: {
        stockEntry: true,
        purchaseOrder: {
          include: {
            items: true,
            supplier: true,
          },
        },
      },
    });

    // Check for overdue expenses dynamically
    const now = new Date();
    const updatedExpenses = expenses.map((exp) => {
      if (exp.status === 'PENDING' && new Date(exp.dueDate) < now) {
        return { ...exp, status: 'OVERDUE' };
      }
      return exp;
    });

    return updatedExpenses;
  }

  async markAsPaid(clinicId: string, id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id, clinicId },
    });

    if (!expense) throw new NotFoundException('Expense not found');

    return this.prisma.expense.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });
  }

  async getDashboardMetrics(clinicId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Fetch all unpaid expenses globally (no date filter)
    const activeExpenses = await this.prisma.expense.findMany({
      where: {
        clinicId,
        status: { in: ['PENDING', 'OVERDUE'] },
      },
    });

    // Fetch paid expenses ONLY for the current month
    const paidThisMonth = await this.prisma.expense.findMany({
      where: {
        clinicId,
        status: 'PAID',
        paidAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const totalPending = activeExpenses
      .filter((e) => e.status === 'PENDING' && new Date(e.dueDate) >= now)
      .reduce((sum, e) => sum + e.amountCents, 0);

    const totalOverdue = activeExpenses
      .filter((e) => e.status === 'OVERDUE' || (e.status === 'PENDING' && new Date(e.dueDate) < now))
      .reduce((sum, e) => sum + e.amountCents, 0);

    const totalPaid = paidThisMonth.reduce((sum, e) => sum + e.amountCents, 0);

    return {
      totalPending,
      totalOverdue,
      totalPaid,
      count: activeExpenses.length + paidThisMonth.length,
    };
  }
}
