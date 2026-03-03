-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'AGUARDANDO_REPOSICAO';
ALTER TYPE "OrderStatus" ADD VALUE 'MATERIAL_RECEBIDO';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isAdhoc" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "occurrenceId" TEXT;

-- CreateIndex
CREATE INDEX "StockMovement_occurrenceId_idx" ON "StockMovement"("occurrenceId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "Occurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
