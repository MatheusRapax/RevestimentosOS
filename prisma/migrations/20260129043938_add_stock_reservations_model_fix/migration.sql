/*
  Warnings:

  - A unique constraint covering the columns `[clinicId,lotNumber]` on the table `StockLot` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'EXPIRED', 'CANCELLED');

-- DropIndex
DROP INDEX "StockLot_clinicId_productId_expirationDate_idx";

-- AlterTable
ALTER TABLE "StockLot" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "StockReservation" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "orderId" TEXT,
    "quoteId" TEXT,
    "lotId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockReservation_clinicId_idx" ON "StockReservation"("clinicId");

-- CreateIndex
CREATE INDEX "StockReservation_orderId_idx" ON "StockReservation"("orderId");

-- CreateIndex
CREATE INDEX "StockReservation_quoteId_idx" ON "StockReservation"("quoteId");

-- CreateIndex
CREATE INDEX "StockReservation_lotId_idx" ON "StockReservation"("lotId");

-- CreateIndex
CREATE INDEX "StockLot_clinicId_productId_idx" ON "StockLot"("clinicId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "StockLot_clinicId_lotNumber_key" ON "StockLot"("clinicId", "lotNumber");

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "StockLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
