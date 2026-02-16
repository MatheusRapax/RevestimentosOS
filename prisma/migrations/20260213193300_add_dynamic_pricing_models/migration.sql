/*
  Warnings:

  - A unique constraint covering the columns `[customerId]` on the table `PatientAccount` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[accessKey]` on the table `StockEntry` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'AWAITING_STOCK', 'AWAITING_PICKING', 'IN_PICKING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'PARTIALLY_FULFILLED');

-- CreateEnum
CREATE TYPE "FiscalStatus" AS ENUM ('DRAFT', 'PROCESSING', 'APPROVED', 'REJECTED', 'CANCELLED', 'CONTINGENCY');

-- CreateEnum
CREATE TYPE "FiscalType" AS ENUM ('NFE', 'NFCE');

-- AlterEnum
ALTER TYPE "ExitType" ADD VALUE 'SALE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'RASCUNHO';
ALTER TYPE "OrderStatus" ADD VALUE 'AGUARDANDO_PAGAMENTO';
ALTER TYPE "OrderStatus" ADD VALUE 'AGUARDANDO_COMPRA';
ALTER TYPE "OrderStatus" ADD VALUE 'AGUARDANDO_CHEGADA';
ALTER TYPE "OrderStatus" ADD VALUE 'EM_SEPARACAO';
ALTER TYPE "OrderStatus" ADD VALUE 'PRONTO_PARA_RETIRA';
ALTER TYPE "OrderStatus" ADD VALUE 'SAIU_PARA_ENTREGA';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'FISCAL_EMIT';
ALTER TYPE "TransactionType" ADD VALUE 'FISCAL_CANCEL';

-- AlterTable
ALTER TABLE "Architect" ADD COLUMN     "birthDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "globalMarkup" DOUBLE PRECISION NOT NULL DEFAULT 40.0;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "birthDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "PatientAccount" ADD COLUMN     "customerId" TEXT,
ALTER COLUMN "patientId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "customerId" TEXT,
ALTER COLUMN "patientId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "brandId" TEXT,
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "cest" TEXT,
ADD COLUMN     "manualPrice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "markup" DOUBLE PRECISION,
ADD COLUMN     "mva" DOUBLE PRECISION,
ADD COLUMN     "ncm" TEXT,
ADD COLUMN     "origin" INTEGER,
ADD COLUMN     "palletCoverage" DOUBLE PRECISION,
ADD COLUMN     "palletWeight" DOUBLE PRECISION,
ADD COLUMN     "taxClass" TEXT;

-- AlterTable
ALTER TABLE "StockEntry" ADD COLUMN     "accessKey" TEXT,
ADD COLUMN     "calculationBaseICMS" INTEGER DEFAULT 0,
ADD COLUMN     "calculationBaseICMSST" INTEGER DEFAULT 0,
ADD COLUMN     "carrierDocument" TEXT,
ADD COLUMN     "carrierName" TEXT,
ADD COLUMN     "carrierPlate" TEXT,
ADD COLUMN     "carrierState" TEXT,
ADD COLUMN     "discountValueCents" INTEGER DEFAULT 0,
ADD COLUMN     "freightType" INTEGER,
ADD COLUMN     "freightValueCents" INTEGER DEFAULT 0,
ADD COLUMN     "grossWeight" DOUBLE PRECISION,
ADD COLUMN     "insuranceValueCents" INTEGER DEFAULT 0,
ADD COLUMN     "model" TEXT DEFAULT '55',
ADD COLUMN     "netWeight" DOUBLE PRECISION,
ADD COLUMN     "operationNature" TEXT,
ADD COLUMN     "otherExpensesValueCents" INTEGER DEFAULT 0,
ADD COLUMN     "protocol" TEXT,
ADD COLUMN     "purchaseOrderId" TEXT,
ADD COLUMN     "totalIPIValueCents" INTEGER DEFAULT 0,
ADD COLUMN     "totalProductsValueCents" INTEGER DEFAULT 0,
ADD COLUMN     "valueICMS" INTEGER DEFAULT 0,
ADD COLUMN     "valueICMSST" INTEGER DEFAULT 0,
ADD COLUMN     "volumeQuantity" INTEGER,
ADD COLUMN     "volumeSpecies" TEXT;

-- AlterTable
ALTER TABLE "StockEntryItem" ADD COLUMN     "cfop" TEXT,
ADD COLUMN     "cst" TEXT,
ADD COLUMN     "discountValueCents" INTEGER DEFAULT 0,
ADD COLUMN     "freightValueCents" INTEGER DEFAULT 0,
ADD COLUMN     "insuranceValueCents" INTEGER DEFAULT 0,
ADD COLUMN     "ncm" TEXT,
ADD COLUMN     "rateICMS" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "rateIPI" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "valueICMS" INTEGER DEFAULT 0,
ADD COLUMN     "valueIPI" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "StockReservation" ADD COLUMN     "orderItemId" TEXT,
ADD COLUMN     "productId" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "customerId" TEXT,
ALTER COLUMN "patientId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultMarkup" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultMarkup" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteTemplate" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "companyName" TEXT,
    "companyLogo" TEXT,
    "companyPhone" TEXT,
    "companyEmail" TEXT,
    "companyAddress" TEXT,
    "companyCnpj" TEXT,
    "bankName" TEXT,
    "bankAgency" TEXT,
    "bankAccount" TEXT,
    "bankAccountHolder" TEXT,
    "bankCnpj" TEXT,
    "pixKey" TEXT,
    "termsAndConditions" TEXT,
    "validityDays" INTEGER NOT NULL DEFAULT 10,
    "validityText" TEXT,
    "defaultDeliveryDays" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#000000',
    "accentColor" TEXT NOT NULL DEFAULT '#4CAF50',
    "showSignatureLines" BOOLEAN NOT NULL DEFAULT true,
    "showBankDetails" BOOLEAN NOT NULL DEFAULT true,
    "showTerms" BOOLEAN NOT NULL DEFAULT true,
    "footerText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalDocument" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "orderId" TEXT,
    "uuid" TEXT,
    "status" "FiscalStatus" NOT NULL DEFAULT 'DRAFT',
    "type" "FiscalType" NOT NULL,
    "serie" TEXT,
    "number" TEXT,
    "key" TEXT,
    "xmlUrl" TEXT,
    "danfeUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicFiscalConfig" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "consumerKey" TEXT,
    "consumerSecret" TEXT,
    "accessToken" TEXT,
    "accessTokenSecret" TEXT,
    "environment" TEXT NOT NULL DEFAULT '2',
    "defaultNaturezaOperacao" TEXT NOT NULL DEFAULT 'Venda de mercadoria',
    "defaultTaxClass" TEXT,
    "defaultNcm" TEXT,
    "defaultCest" TEXT,
    "defaultOrigin" INTEGER DEFAULT 0,

    CONSTRAINT "ClinicFiscalConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Category_clinicId_idx" ON "Category"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_clinicId_name_key" ON "Category"("clinicId", "name");

-- CreateIndex
CREATE INDEX "Brand_clinicId_idx" ON "Brand"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_clinicId_name_key" ON "Brand"("clinicId", "name");

-- CreateIndex
CREATE INDEX "QuoteTemplate_clinicId_idx" ON "QuoteTemplate"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalDocument_uuid_key" ON "FiscalDocument"("uuid");

-- CreateIndex
CREATE INDEX "FiscalDocument_clinicId_idx" ON "FiscalDocument"("clinicId");

-- CreateIndex
CREATE INDEX "FiscalDocument_orderId_idx" ON "FiscalDocument"("orderId");

-- CreateIndex
CREATE INDEX "FiscalDocument_uuid_idx" ON "FiscalDocument"("uuid");

-- CreateIndex
CREATE INDEX "FiscalDocument_status_idx" ON "FiscalDocument"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicFiscalConfig_clinicId_key" ON "ClinicFiscalConfig"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientAccount_customerId_key" ON "PatientAccount"("customerId");

-- CreateIndex
CREATE INDEX "PatientAccount_customerId_idx" ON "PatientAccount"("customerId");

-- CreateIndex
CREATE INDEX "Payment_customerId_idx" ON "Payment"("customerId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "StockEntry_accessKey_key" ON "StockEntry"("accessKey");

-- CreateIndex
CREATE INDEX "StockReservation_orderItemId_idx" ON "StockReservation"("orderItemId");

-- CreateIndex
CREATE INDEX "StockReservation_productId_idx" ON "StockReservation"("productId");

-- CreateIndex
CREATE INDEX "Transaction_customerId_idx" ON "Transaction"("customerId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockEntry" ADD CONSTRAINT "StockEntry_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAccount" ADD CONSTRAINT "PatientAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteTemplate" ADD CONSTRAINT "QuoteTemplate_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalDocument" ADD CONSTRAINT "FiscalDocument_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalDocument" ADD CONSTRAINT "FiscalDocument_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicFiscalConfig" ADD CONSTRAINT "ClinicFiscalConfig_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
