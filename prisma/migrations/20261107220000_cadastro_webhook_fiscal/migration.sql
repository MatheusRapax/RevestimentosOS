-- Último resultado do cadastro do webhook do ERP no NexosFiscal (A17)
ALTER TABLE "ClinicFiscalConfig" ADD COLUMN     "webhookError" TEXT,
ADD COLUMN     "webhookRegisteredAt" TIMESTAMP(3),
ADD COLUMN     "webhookUrl" TEXT;
