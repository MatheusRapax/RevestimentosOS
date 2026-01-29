-- AlterTable
ALTER TABLE "StockReservation" ADD COLUMN     "quoteItemId" TEXT;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_quoteItemId_fkey" FOREIGN KEY ("quoteItemId") REFERENCES "QuoteItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
