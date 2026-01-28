-- AlterTable
ALTER TABLE "ProcedurePerformed" ADD COLUMN     "procedureId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "costCents" INTEGER,
ADD COLUMN     "priceCents" INTEGER;

-- CreateTable
CREATE TABLE "Procedure" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "durationMin" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Procedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedureConsumable" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcedureConsumable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Procedure_clinicId_idx" ON "Procedure"("clinicId");

-- CreateIndex
CREATE INDEX "Procedure_clinicId_isActive_idx" ON "Procedure"("clinicId", "isActive");

-- CreateIndex
CREATE INDEX "ProcedureConsumable_procedureId_idx" ON "ProcedureConsumable"("procedureId");

-- CreateIndex
CREATE INDEX "ProcedureConsumable_productId_idx" ON "ProcedureConsumable"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcedureConsumable_procedureId_productId_key" ON "ProcedureConsumable"("procedureId", "productId");

-- CreateIndex
CREATE INDEX "ProcedurePerformed_procedureId_idx" ON "ProcedurePerformed"("procedureId");

-- AddForeignKey
ALTER TABLE "ProcedurePerformed" ADD CONSTRAINT "ProcedurePerformed_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureConsumable" ADD CONSTRAINT "ProcedureConsumable_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureConsumable" ADD CONSTRAINT "ProcedureConsumable_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
