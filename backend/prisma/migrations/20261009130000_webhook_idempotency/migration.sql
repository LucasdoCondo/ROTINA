-- Tabela de idempotência para webhooks de pagamento (anti-replay).
-- Gateways usam entrega "at-least-once": o mesmo PAYMENT_CONFIRMED pode
-- ser entregue 2+ vezes. Reprocessá-lo estenderia currentPeriodEnd
-- repetidamente. Registra paymentId já processado (único).
-- NÃO tem FK para Tenant: a marca d'água sobrevive à exclusão LGPD.
CREATE TABLE "ProcessedWebhook" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhook_pkey" PRIMARY KEY ("id")
);

-- CREATE UNIQUE INDEX garante idempotência no nível do banco
-- (race condition entre webhooks simultâneos não cria duplicados)
CREATE UNIQUE INDEX "ProcessedWebhook_paymentId_key" ON "ProcessedWebhook"("paymentId");
CREATE INDEX "ProcessedWebhook_type_idx" ON "ProcessedWebhook"("type");