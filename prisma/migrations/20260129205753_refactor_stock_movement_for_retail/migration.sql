-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "purchaseOrderId" TEXT,
ADD COLUMN     "stockEntryId" TEXT,
ADD COLUMN     "stockExitId" TEXT;

-- CreateIndex
CREATE INDEX "StockMovement_orderId_idx" ON "StockMovement"("orderId");

-- CreateIndex
CREATE INDEX "StockMovement_purchaseOrderId_idx" ON "StockMovement"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "StockMovement_stockEntryId_idx" ON "StockMovement"("stockEntryId");

-- CreateIndex
CREATE INDEX "StockMovement_stockExitId_idx" ON "StockMovement"("stockExitId");
