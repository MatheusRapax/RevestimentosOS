/*
  Warnings:

  - You are about to drop the column `commissionRate` on the `Architect` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CommissionTargetType" AS ENUM ('SELLER', 'ARCHITECT');

-- CreateEnum
CREATE TYPE "CommissionGoalPeriod" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'ANNUALLY');

-- AlterTable
ALTER TABLE "Architect" DROP COLUMN "commissionRate",
ADD COLUMN     "commissionRuleId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "environmentId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "orderId" TEXT;

-- AlterTable
ALTER TABLE "QuoteItem" ADD COLUMN     "environmentId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "commissionRuleId" TEXT;

-- AlterTable
ALTER TABLE "UserDashboardConfig" ADD COLUMN     "shortcuts" JSONB DEFAULT '[]';

-- CreateTable
CREATE TABLE "Environment" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Environment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetType" "CommissionTargetType" NOT NULL,
    "goalPeriod" "CommissionGoalPeriod" NOT NULL DEFAULT 'MONTHLY',
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionTier" (
    "id" TEXT NOT NULL,
    "commissionRuleId" TEXT NOT NULL,
    "minGoalAmount" INTEGER NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CommissionTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Environment_clinicId_idx" ON "Environment"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "Environment_clinicId_name_key" ON "Environment"("clinicId", "name");

-- CreateIndex
CREATE INDEX "CommissionRule_clinicId_idx" ON "CommissionRule"("clinicId");

-- CreateIndex
CREATE INDEX "CommissionTier_commissionRuleId_idx" ON "CommissionTier"("commissionRuleId");

-- CreateIndex
CREATE INDEX "CommissionTier_commissionRuleId_minGoalAmount_idx" ON "CommissionTier"("commissionRuleId", "minGoalAmount");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_commissionRuleId_fkey" FOREIGN KEY ("commissionRuleId") REFERENCES "CommissionRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Architect" ADD CONSTRAINT "Architect_commissionRuleId_fkey" FOREIGN KEY ("commissionRuleId") REFERENCES "CommissionRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionTier" ADD CONSTRAINT "CommissionTier_commissionRuleId_fkey" FOREIGN KEY ("commissionRuleId") REFERENCES "CommissionRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
