-- CreateTable
CREATE TABLE "RegraIcms" (
    "id" TEXT NOT NULL,
    "codigo" TEXT,
    "clinicId" TEXT,
    "ufOrigem" TEXT,
    "ufDestino" TEXT,
    "mesmaUf" BOOLEAN,
    "regime" INTEGER NOT NULL,
    "ncm" TEXT,
    "origemMercadoria" INTEGER,
    "consumidorFinal" BOOLEAN,
    "contribuinte" BOOLEAN,
    "cst" TEXT NOT NULL,
    "modBC" INTEGER NOT NULL DEFAULT 0,
    "aliquota" DOUBLE PRECISION NOT NULL,
    "reducaoBase" DOUBLE PRECISION,
    "temSt" BOOLEAN NOT NULL DEFAULT false,
    "mvaSt" DOUBLE PRECISION,
    "aliquotaFcp" DOUBLE PRECISION,
    "aliquotaInterna" DOUBLE PRECISION,
    "observacao" TEXT,
    "vigenciaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigenciaFim" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegraIcms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegraPisCofins" (
    "id" TEXT NOT NULL,
    "codigo" TEXT,
    "clinicId" TEXT,
    "regime" INTEGER NOT NULL,
    "cst" TEXT NOT NULL,
    "aliquotaPis" DOUBLE PRECISION NOT NULL,
    "aliquotaCofins" DOUBLE PRECISION NOT NULL,
    "observacao" TEXT,
    "vigenciaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigenciaFim" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegraPisCofins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegraIpi" (
    "id" TEXT NOT NULL,
    "codigo" TEXT,
    "clinicId" TEXT,
    "ncm" TEXT NOT NULL,
    "cst" TEXT NOT NULL,
    "aliquota" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "vigenciaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigenciaFim" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegraIpi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegraIcms_codigo_key" ON "RegraIcms"("codigo");

-- CreateIndex
CREATE INDEX "RegraIcms_ufOrigem_ufDestino_regime_idx" ON "RegraIcms"("ufOrigem", "ufDestino", "regime");

-- CreateIndex
CREATE INDEX "RegraIcms_mesmaUf_regime_idx" ON "RegraIcms"("mesmaUf", "regime");

-- CreateIndex
CREATE INDEX "RegraIcms_clinicId_idx" ON "RegraIcms"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "RegraPisCofins_codigo_key" ON "RegraPisCofins"("codigo");

-- CreateIndex
CREATE INDEX "RegraPisCofins_regime_cst_idx" ON "RegraPisCofins"("regime", "cst");

-- CreateIndex
CREATE INDEX "RegraPisCofins_clinicId_idx" ON "RegraPisCofins"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "RegraIpi_codigo_key" ON "RegraIpi"("codigo");

-- CreateIndex
CREATE INDEX "RegraIpi_ncm_idx" ON "RegraIpi"("ncm");

-- CreateIndex
CREATE INDEX "RegraIpi_clinicId_idx" ON "RegraIpi"("clinicId");
