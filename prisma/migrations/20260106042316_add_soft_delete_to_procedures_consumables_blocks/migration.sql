-- AlterTable
ALTER TABLE "ConsumableUsage" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ProcedurePerformed" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ScheduleBlock" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
