-- AlterTable: acompanhamento da nota no serviço fiscal (ambiente, cancelamento, eventos recusados)
ALTER TABLE "FiscalDocument"
  ADD COLUMN "environment" TEXT,
  ADD COLUMN "cancelEventId" TEXT,
  ADD COLUMN "cancelRequestedAt" TIMESTAMP(3),
  ADD COLUMN "cancelJustification" TEXT,
  ADD COLUMN "eventError" TEXT,
  ADD COLUMN "eventErrorType" TEXT;

-- AlterTable: cursor da reconciliação periódica
ALTER TABLE "ClinicFiscalConfig" ADD COLUMN "lastReconciledAt" TIMESTAMP(3);
