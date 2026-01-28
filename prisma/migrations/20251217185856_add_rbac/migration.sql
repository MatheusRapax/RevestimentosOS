/*
  Warnings:

  - Added the required column `roleId` to the `ClinicUser` table without a default value. This is not possible if the table is not empty.

*/

-- CreateTable: Role
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Permission
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable: RolePermission
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "RolePermission_roleId_idx" ON "RolePermission"("roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- Insert temporary CLINIC_ADMIN role for existing records
INSERT INTO "Role" ("id", "key", "name", "description", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'CLINIC_ADMIN', 'Administrador da Clínica', 'Acesso total à clínica', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable: Add roleId column with temporary default
ALTER TABLE "ClinicUser" ADD COLUMN "roleId" TEXT;

-- Update existing records with CLINIC_ADMIN role
UPDATE "ClinicUser" 
SET "roleId" = (SELECT "id" FROM "Role" WHERE "key" = 'CLINIC_ADMIN' LIMIT 1)
WHERE "roleId" IS NULL;

-- Make roleId NOT NULL
ALTER TABLE "ClinicUser" ALTER COLUMN "roleId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ClinicUser_roleId_idx" ON "ClinicUser"("roleId");

-- AddForeignKey
ALTER TABLE "ClinicUser" ADD CONSTRAINT "ClinicUser_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

