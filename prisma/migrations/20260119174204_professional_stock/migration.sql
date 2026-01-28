-- AlterTable
ALTER TABLE "ConsumableUsage" ADD COLUMN     "productId" TEXT;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "destinationName" TEXT,
ADD COLUMN     "destinationType" TEXT,
ADD COLUMN     "encounterId" TEXT,
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "supplier" TEXT;

-- CreateIndex
CREATE INDEX "StockMovement_encounterId_idx" ON "StockMovement"("encounterId");

-- AddForeignKey
ALTER TABLE "ConsumableUsage" ADD CONSTRAINT "ConsumableUsage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
