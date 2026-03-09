-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "documentUrl" TEXT,
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "isServiceInvoice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "issueDate" TIMESTAMP(3),
ADD COLUMN     "providerDocument" TEXT,
ADD COLUMN     "providerName" TEXT;
