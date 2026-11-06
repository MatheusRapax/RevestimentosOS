-- AlterTable: status bruto do serviço fiscal e detalhe (AWAITING_SEFAZ, FAILED)
ALTER TABLE "FiscalDocument"
  ADD COLUMN "remoteStatus" TEXT,
  ADD COLUMN "statusDetail" TEXT;
