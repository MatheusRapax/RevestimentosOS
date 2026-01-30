/*
  Warnings:

  - The values [PENDING,CONFIRMED,IN_SEPARATION,READY,DELIVERED,CANCELLED,AWAITING_STOCK,PARTIAL_READY] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [DRAFT,SENT,APPROVED,REJECTED,EXPIRED,CONVERTED] on the enum `QuoteStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "ReservationType" AS ENUM ('ORCAMENTO', 'PEDIDO');

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('CRIADO', 'PAGO', 'AGUARDANDO_MATERIAL', 'PRONTO_PARA_ENTREGA', 'ENTREGUE', 'CANCELADO');
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'CRIADO';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "QuoteStatus_new" AS ENUM ('EM_ORCAMENTO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'REJEITADO', 'EXPIRADO', 'CONVERTIDO');
ALTER TABLE "Quote" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Quote" ALTER COLUMN "status" TYPE "QuoteStatus_new" USING ("status"::text::"QuoteStatus_new");
ALTER TYPE "QuoteStatus" RENAME TO "QuoteStatus_old";
ALTER TYPE "QuoteStatus_new" RENAME TO "QuoteStatus";
DROP TYPE "QuoteStatus_old";
ALTER TABLE "Quote" ALTER COLUMN "status" SET DEFAULT 'EM_ORCAMENTO';
COMMIT;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'CRIADO';

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "status" TEXT;

-- AlterTable
ALTER TABLE "Quote" ALTER COLUMN "status" SET DEFAULT 'EM_ORCAMENTO';

-- AlterTable
ALTER TABLE "StockReservation" ADD COLUMN     "type" "ReservationType" NOT NULL DEFAULT 'ORCAMENTO';
