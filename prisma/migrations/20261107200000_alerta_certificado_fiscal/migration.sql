-- Validade do certificado A1 e último aviso recebido do NexosFiscal (webhook CertificateExpiring, A16)
ALTER TABLE "ClinicFiscalConfig" ADD COLUMN     "certificateAlertAt" TIMESTAMP(3),
ADD COLUMN     "certificateNotAfter" TIMESTAMP(3);
