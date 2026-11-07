-- Histórico de transferência de vendas entre vendedores + permissão para transferir.
-- CreateTable
CREATE TABLE "SalesTransfer" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityNumber" INTEGER,
    "fromSellerId" TEXT NOT NULL,
    "toSellerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "commissionImpact" BOOLEAN NOT NULL DEFAULT false,
    "batchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesTransfer_clinicId_createdAt_idx" ON "SalesTransfer"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "SalesTransfer_entity_entityId_idx" ON "SalesTransfer"("entity", "entityId");

-- CreateIndex
CREATE INDEX "SalesTransfer_fromSellerId_idx" ON "SalesTransfer"("fromSellerId");

-- CreateIndex
CREATE INDEX "SalesTransfer_toSellerId_idx" ON "SalesTransfer"("toSellerId");

-- CreateIndex
CREATE INDEX "SalesTransfer_batchId_idx" ON "SalesTransfer"("batchId");

-- AddForeignKey
ALTER TABLE "SalesTransfer" ADD CONSTRAINT "SalesTransfer_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesTransfer" ADD CONSTRAINT "SalesTransfer_fromSellerId_fkey" FOREIGN KEY ("fromSellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesTransfer" ADD CONSTRAINT "SalesTransfer_toSellerId_fkey" FOREIGN KEY ("toSellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesTransfer" ADD CONSTRAINT "SalesTransfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Permissão: só quem a tem transfere vendas. Concedida por padrão a Administrador e Gerente.
INSERT INTO "Permission" ("id", "key", "description", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'sales.transfer', 'Transferir vendas entre vendedores', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE "key" = 'sales.transfer');

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" = 'sales.transfer'
WHERE r."key" IN ('ADMIN', 'MANAGER')
ON CONFLICT DO NOTHING;
