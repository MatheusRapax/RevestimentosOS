/*
  Warnings:

  - You are about to drop the column `accessToken` on the `ClinicFiscalConfig` table. All the data in the column will be lost.
  - You are about to drop the column `accessTokenSecret` on the `ClinicFiscalConfig` table. All the data in the column will be lost.
  - You are about to drop the column `consumerKey` on the `ClinicFiscalConfig` table. All the data in the column will be lost.
  - You are about to drop the column `consumerSecret` on the `ClinicFiscalConfig` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ClinicFiscalConfig" DROP COLUMN "accessToken",
DROP COLUMN "accessTokenSecret",
DROP COLUMN "consumerKey",
DROP COLUMN "consumerSecret",
ADD COLUMN     "nexosApiKey" TEXT,
ADD COLUMN     "nexosTenantId" TEXT;
