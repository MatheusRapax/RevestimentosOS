/*
  Warnings:

  - Added the required column `date` to the `Encounter` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Encounter" ADD COLUMN     "date" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "time" TEXT;
