-- AlterTable
ALTER TABLE "QuoteTemplate" ADD COLUMN "paymentMethodsInfo" TEXT;
ALTER TABLE "QuoteTemplate" ADD COLUMN "showPaymentMethods" BOOLEAN NOT NULL DEFAULT true;
