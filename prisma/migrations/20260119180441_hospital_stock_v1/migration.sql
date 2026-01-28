-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELED');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('INVOICE', 'MANUAL', 'DONATION', 'RETURN');

-- CreateEnum
CREATE TYPE "ExitStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "ExitType" AS ENUM ('SECTOR_REQUEST', 'PATIENT_USE', 'DISCARD', 'EXPIRY', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "StockEntry" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "type" "EntryType" NOT NULL DEFAULT 'INVOICE',
    "invoiceNumber" TEXT,
    "series" TEXT,
    "supplierId" TEXT,
    "supplierName" TEXT,
    "emissionDate" TIMESTAMP(3),
    "arrivalDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalValue" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,

    CONSTRAINT "StockEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockEntryItem" (
    "id" TEXT NOT NULL,
    "stockEntryId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "lotNumber" TEXT,
    "expirationDate" TIMESTAMP(3),
    "manufacturer" TEXT,

    CONSTRAINT "StockEntryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockExit" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "status" "ExitStatus" NOT NULL DEFAULT 'DRAFT',
    "type" "ExitType" NOT NULL DEFAULT 'SECTOR_REQUEST',
    "destinationType" TEXT,
    "destinationName" TEXT,
    "encounterId" TEXT,
    "requestedBy" TEXT,
    "approvedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "StockExit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockExitItem" (
    "id" TEXT NOT NULL,
    "stockExitId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "lotId" TEXT,

    CONSTRAINT "StockExitItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockEntry_clinicId_idx" ON "StockEntry"("clinicId");

-- CreateIndex
CREATE INDEX "StockEntry_status_idx" ON "StockEntry"("status");

-- CreateIndex
CREATE INDEX "StockEntryItem_stockEntryId_idx" ON "StockEntryItem"("stockEntryId");

-- CreateIndex
CREATE INDEX "StockEntryItem_productId_idx" ON "StockEntryItem"("productId");

-- CreateIndex
CREATE INDEX "StockExit_clinicId_idx" ON "StockExit"("clinicId");

-- CreateIndex
CREATE INDEX "StockExit_status_idx" ON "StockExit"("status");

-- CreateIndex
CREATE INDEX "StockExitItem_stockExitId_idx" ON "StockExitItem"("stockExitId");

-- CreateIndex
CREATE INDEX "StockExitItem_productId_idx" ON "StockExitItem"("productId");

-- AddForeignKey
ALTER TABLE "StockEntry" ADD CONSTRAINT "StockEntry_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockEntryItem" ADD CONSTRAINT "StockEntryItem_stockEntryId_fkey" FOREIGN KEY ("stockEntryId") REFERENCES "StockEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockEntryItem" ADD CONSTRAINT "StockEntryItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockExit" ADD CONSTRAINT "StockExit_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockExitItem" ADD CONSTRAINT "StockExitItem_stockExitId_fkey" FOREIGN KEY ("stockExitId") REFERENCES "StockExit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockExitItem" ADD CONSTRAINT "StockExitItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockExitItem" ADD CONSTRAINT "StockExitItem_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "StockLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
