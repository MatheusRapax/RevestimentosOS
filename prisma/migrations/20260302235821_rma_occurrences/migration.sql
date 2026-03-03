-- CreateEnum
CREATE TYPE "OccurrenceType" AS ENUM ('RECEBIMENTO', 'ENTREGA', 'DEFEITO');

-- CreateEnum
CREATE TYPE "OccurrenceStatus" AS ENUM ('RASCUNHO', 'REPORTADO', 'AGUARDANDO_FORNECEDOR', 'RESOLVIDO', 'REEMBOLSADO', 'CANCELADO');

-- AlterEnum
ALTER TYPE "StockMovementType" ADD VALUE 'AVARIA';

-- CreateTable
CREATE TABLE "Occurrence" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "type" "OccurrenceType" NOT NULL,
    "status" "OccurrenceStatus" NOT NULL DEFAULT 'RASCUNHO',
    "supplierId" TEXT,
    "customerId" TEXT,
    "orderId" TEXT,
    "stockEntryId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Occurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OccurrenceItem" (
    "id" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lotId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OccurrenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Occurrence_clinicId_idx" ON "Occurrence"("clinicId");

-- CreateIndex
CREATE INDEX "Occurrence_supplierId_idx" ON "Occurrence"("supplierId");

-- CreateIndex
CREATE INDEX "Occurrence_customerId_idx" ON "Occurrence"("customerId");

-- CreateIndex
CREATE INDEX "Occurrence_orderId_idx" ON "Occurrence"("orderId");

-- CreateIndex
CREATE INDEX "Occurrence_stockEntryId_idx" ON "Occurrence"("stockEntryId");

-- CreateIndex
CREATE INDEX "OccurrenceItem_occurrenceId_idx" ON "OccurrenceItem"("occurrenceId");

-- CreateIndex
CREATE INDEX "OccurrenceItem_productId_idx" ON "OccurrenceItem"("productId");

-- CreateIndex
CREATE INDEX "OccurrenceItem_lotId_idx" ON "OccurrenceItem"("lotId");

-- AddForeignKey
ALTER TABLE "Occurrence" ADD CONSTRAINT "Occurrence_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Occurrence" ADD CONSTRAINT "Occurrence_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Occurrence" ADD CONSTRAINT "Occurrence_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Occurrence" ADD CONSTRAINT "Occurrence_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Occurrence" ADD CONSTRAINT "Occurrence_stockEntryId_fkey" FOREIGN KEY ("stockEntryId") REFERENCES "StockEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccurrenceItem" ADD CONSTRAINT "OccurrenceItem_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "Occurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccurrenceItem" ADD CONSTRAINT "OccurrenceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccurrenceItem" ADD CONSTRAINT "OccurrenceItem_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "StockLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
