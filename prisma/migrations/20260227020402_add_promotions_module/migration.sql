/*
  Warnings:

  - A unique constraint covering the columns `[clinicId,productId,lotNumber]` on the table `StockLot` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "StockLot_clinicId_lotNumber_key";

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "stockEntryId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "areaWithMargin" DOUBLE PRECISION,
ADD COLUMN     "marginPercent" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "globalMarginPercent" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "QuoteItem" ADD COLUMN     "areaWithMargin" DOUBLE PRECISION,
ADD COLUMN     "marginPercent" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "StockEntry" ADD COLUMN     "installmentsData" JSONB;

-- AlterTable
ALTER TABLE "StockLot" ALTER COLUMN "expirationDate" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discountPercent" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionProduct" (
    "promotionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "PromotionProduct_pkey" PRIMARY KEY ("promotionId","productId")
);

-- CreateIndex
CREATE INDEX "Promotion_clinicId_idx" ON "Promotion"("clinicId");

-- CreateIndex
CREATE INDEX "Promotion_isActive_idx" ON "Promotion"("isActive");

-- CreateIndex
CREATE INDEX "PromotionProduct_promotionId_idx" ON "PromotionProduct"("promotionId");

-- CreateIndex
CREATE INDEX "PromotionProduct_productId_idx" ON "PromotionProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "StockLot_clinicId_productId_lotNumber_key" ON "StockLot"("clinicId", "productId", "lotNumber");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_stockEntryId_fkey" FOREIGN KEY ("stockEntryId") REFERENCES "StockEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_stockExitId_fkey" FOREIGN KEY ("stockExitId") REFERENCES "StockExit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_stockEntryId_fkey" FOREIGN KEY ("stockEntryId") REFERENCES "StockEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionProduct" ADD CONSTRAINT "PromotionProduct_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionProduct" ADD CONSTRAINT "PromotionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
