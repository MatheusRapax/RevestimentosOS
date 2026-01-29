-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('SUPPLIER', 'OPERATIONAL', 'TAX', 'COMMISSION', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- DropIndex
DROP INDEX "PurchaseOrder_clinicId_idx";

-- DropIndex
DROP INDEX "PurchaseOrder_clinicId_status_idx";

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "type" "ExpenseType" NOT NULL DEFAULT 'OPERATIONAL',
    "purchaseOrderId" TEXT,
    "barCode" TEXT,
    "recipientName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_clinicId_idx" ON "Expense"("clinicId");

-- CreateIndex
CREATE INDEX "Expense_clinicId_status_idx" ON "Expense"("clinicId", "status");

-- CreateIndex
CREATE INDEX "Expense_clinicId_dueDate_idx" ON "Expense"("clinicId", "dueDate");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
