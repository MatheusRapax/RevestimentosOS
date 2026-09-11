-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "consumidorFinal" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "countryCode" TEXT DEFAULT '1058',
ADD COLUMN     "indicadorIe" INTEGER,
ADD COLUMN     "municipioIbge" TEXT,
ADD COLUMN     "suframa" TEXT;

-- CreateTable
CREATE TABLE "FiscalProfile" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "cnpj" TEXT,
    "ie" TEXT,
    "im" TEXT,
    "crt" INTEGER NOT NULL DEFAULT 3,
    "cnae" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "municipioIbge" TEXT,
    "municipioNome" TEXT,
    "uf" TEXT,
    "cep" TEXT,
    "serieNfe" INTEGER NOT NULL DEFAULT 1,
    "serieNfce" INTEGER NOT NULL DEFAULT 1,
    "cscId" TEXT,
    "cscToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FiscalProfile_clinicId_key" ON "FiscalProfile"("clinicId");

-- AddForeignKey
ALTER TABLE "FiscalProfile" ADD CONSTRAINT "FiscalProfile_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
