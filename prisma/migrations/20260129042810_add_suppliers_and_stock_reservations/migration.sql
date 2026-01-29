-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "salesOrderId" TEXT,
ADD COLUMN     "supplierId" TEXT;

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Supplier_clinicId_idx" ON "Supplier"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_clinicId_cnpj_key" ON "Supplier"("clinicId", "cnpj");

-- CreateIndex
CREATE INDEX "PurchaseOrder_clinicId_idx" ON "PurchaseOrder"("clinicId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
