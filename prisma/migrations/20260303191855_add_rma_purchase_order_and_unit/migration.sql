-- AlterTable
ALTER TABLE "Occurrence" ADD COLUMN     "purchaseOrderId" TEXT;

-- AlterTable
ALTER TABLE "OccurrenceItem" ADD COLUMN     "unitType" TEXT NOT NULL DEFAULT 'CAIXA';

-- CreateIndex
CREATE INDEX "Occurrence_purchaseOrderId_idx" ON "Occurrence"("purchaseOrderId");

-- AddForeignKey
ALTER TABLE "Occurrence" ADD CONSTRAINT "Occurrence_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
