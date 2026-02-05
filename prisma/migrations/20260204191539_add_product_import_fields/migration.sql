-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "format" TEXT,
ADD COLUMN     "line" TEXT,
ADD COLUMN     "supplierCode" TEXT,
ADD COLUMN     "supplierId" TEXT,
ADD COLUMN     "usage" TEXT;

-- CreateIndex
CREATE INDEX "Product_supplierId_idx" ON "Product"("supplierId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
