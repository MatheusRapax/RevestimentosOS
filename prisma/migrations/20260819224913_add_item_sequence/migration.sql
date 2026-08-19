-- AlterTable
ALTER TABLE "ClinicFiscalConfig" ADD COLUMN     "defaultCfop" TEXT,
ADD COLUMN     "defaultCst" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "sequence" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PurchaseOrderItem" ADD COLUMN     "supplierId" TEXT;

-- AlterTable
ALTER TABLE "QuoteItem" ADD COLUMN     "sequence" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "StockEntry" ADD COLUMN     "hasPriceDivergence" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StockEntryItem" ADD COLUMN     "cest" TEXT,
ADD COLUMN     "purchaseOrderId" TEXT,
ADD COLUMN     "purchaseOrderItemId" TEXT;
