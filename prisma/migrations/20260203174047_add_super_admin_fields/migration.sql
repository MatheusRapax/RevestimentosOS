-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "modules" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
