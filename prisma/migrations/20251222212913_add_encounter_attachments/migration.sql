-- CreateTable
CREATE TABLE "EncounterAttachment" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EncounterAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EncounterAttachment_clinicId_idx" ON "EncounterAttachment"("clinicId");

-- CreateIndex
CREATE INDEX "EncounterAttachment_encounterId_idx" ON "EncounterAttachment"("encounterId");

-- AddForeignKey
ALTER TABLE "EncounterAttachment" ADD CONSTRAINT "EncounterAttachment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterAttachment" ADD CONSTRAINT "EncounterAttachment_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterAttachment" ADD CONSTRAINT "EncounterAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
