-- CreateTable
CREATE TABLE "SupplierMappingCache" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "headersHash" TEXT NOT NULL,
    "mappingPayload" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierMappingCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierMappingCache_clinicId_idx" ON "SupplierMappingCache"("clinicId");

-- CreateIndex
CREATE INDEX "SupplierMappingCache_supplierId_idx" ON "SupplierMappingCache"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierMappingCache_supplierId_headersHash_key" ON "SupplierMappingCache"("supplierId", "headersHash");

-- AddForeignKey
ALTER TABLE "SupplierMappingCache" ADD CONSTRAINT "SupplierMappingCache_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierMappingCache" ADD CONSTRAINT "SupplierMappingCache_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
