-- CreateTable
CREATE TABLE "ProcedurePerformed" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER,
    "notes" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcedurePerformed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumableUsage" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsumableUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcedurePerformed_clinicId_idx" ON "ProcedurePerformed"("clinicId");

-- CreateIndex
CREATE INDEX "ProcedurePerformed_encounterId_idx" ON "ProcedurePerformed"("encounterId");

-- CreateIndex
CREATE INDEX "ConsumableUsage_clinicId_idx" ON "ConsumableUsage"("clinicId");

-- CreateIndex
CREATE INDEX "ConsumableUsage_encounterId_idx" ON "ConsumableUsage"("encounterId");

-- AddForeignKey
ALTER TABLE "ProcedurePerformed" ADD CONSTRAINT "ProcedurePerformed_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedurePerformed" ADD CONSTRAINT "ProcedurePerformed_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumableUsage" ADD CONSTRAINT "ConsumableUsage_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumableUsage" ADD CONSTRAINT "ConsumableUsage_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
