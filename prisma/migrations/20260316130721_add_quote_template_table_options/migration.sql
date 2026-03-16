-- AlterTable
ALTER TABLE "QuoteTemplate" ADD COLUMN     "showQuantity" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showUnitArea" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showUnitPrice" BOOLEAN NOT NULL DEFAULT true;
