/**
 * Testes do fluxo de webhooks de pagamento (Asaas → subscriptionService).
 *
 * Verifica as transições de estado da assinatura:
 * - payment.succeeded      → ACTIVE (+ e-mail de fatura paga + período estendido)
 * - payment.past_due       → PAST_DUE (+ e-mail de alerta sendPaymentFailed)
 * - subscription.suspended → INCOMPLETE
 * - subscription.canceled  → CANCELED (+ tenant inativo)
 * - payment.refunded       → CANCELED (+ tenant inativo)
 * - Evento não mapeado     → ignorado sem quebrar
 * - Resolução de tenant    → via subscriptionId (NUNCA confiando no cliente)
 *
 * Mocks: prisma in-memory + emailService simulado (sem rede, sem BD real).
 */

jest.mock('../src/config/prisma', () => {
  const { createPrismaMemory } = require('./helpers/prismaMemory');
  return createPrismaMemory();
});

jest.mock('../src/services/emailService', () => ({
  sendInvoice: jest.fn().mockResolvedValue({ success: true }),
  sendPaymentFailed: jest.fn().mockResolvedValue({ success: true }),
  sendWelcome: jest.fn().mockResolvedValue({ success: true }),
  sendMemberInvite: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordReset: jest.fn().mockResolvedValue({ success: true }),
  sendGeneric: jest.fn().mockResolvedValue({ success: true }),
  sendTest: jest.fn().mockResolvedValue({ success: true }),
}));

const prisma = require('../src/config/prisma');
const emailService = require('../src/services/emailService');
const { subscriptionService } = require('../src/services/subscriptionService');

/** Aguarda microtasks pendentes (audit log é fire-and-forget no service). */
function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

function seedTenant(overrides = {}) {
  const tenant = {
    id: 'tenant-a',
    name: 'Empresa A',
    slug: 'empresa-a',
    email: 'empresa@a.com',
    plan: 'pro',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  prisma.store.tenant.push(tenant);
  return tenant;
}

function seedSubscription(overrides = {}) {
  const base = {
    id: 'sub-1',
    tenantId: 'tenant-a',
    gateway: 'asaas',
    status: 'INCOMPLETE',
    planId: 'pro',
    billingType: 'PIX',
    asaasSubscriptionId: 'asaas-sub-9',
    asaasCustomerId: 'cus-1',
    currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000), // vencida
    paymentAttempts: 0,
    lastPaymentAttempt: null,
    lastInvoiceUrl: 'http://invoice.example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  prisma.store.subscription.push(base);
  return base;
}

function resetStore() {
  Object.values(prisma.store).forEach((rows) => {
    rows.length = 0;
  });
}

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
});

describe('Fluxo de webhooks — processWebhookEvent', () => {
  // ═══════════════════════════════════════════════
  // PAYMENT_CONFIRMED / PAYMENT_RECEIVED
  // ═══════════════════════════════════════════════
  describe('payment.succeeded → ACTIVE', () => {
    test('ativa a assinatura, estende currentPeriodEnd e zera tentativas', async () => {
      const tenant = seedTenant();
      const sub = seedSubscription();
      const before = new Date(sub.currentPeriodEnd);

      const result = await subscriptionService.processWebhookEvent({
        type: 'payment.succeeded',
        subscriptionId: 'asaas-sub-9',
        tenantId: null, // resolve via subscriptionId do gateway
        paymentId: 'pay-1',
        value: 79.9,
        billingType: 'PIX',
        invoiceUrl: 'http://invoice.example.com/paid',
      });

      expect(result.received).toBe(true);
      expect(result.action).toBe('SUBSCRIPTION_ACTIVATED');
      expect(result.tenantId).toBe('tenant-a');

      const updated = prisma.store.subscription.find((s) => s.id === sub.id);
      expect(updated.status).toBe('ACTIVE');
      expect(updated.paymentAttempts).toBe(0);
      expect(new Date(updated.currentPeriodEnd).getTime()).toBeGreaterThan(
        before.getTime()
      );
      const daysAhead =
        (new Date(updated.currentPeriodEnd) - new Date()) / (24 * 60 * 60 * 1000);
      expect(daysAhead).toBeGreaterThan(29);
      expect(daysAhead).toBeLessThan(31);

      const t = prisma.store.tenant.find((x) => x.id === tenant.id);
      expect(t.active).toBe(true);
    });

    test('envia e-mail de fatura paga (sendInvoice)', async () => {
      seedTenant();
      seedSubscription();

      await subscriptionService.processWebhookEvent({
        type: 'payment.succeeded',
        subscriptionId: 'asaas-sub-9',
        value: 79.9,
        billingType: 'PIX',
      });
      await flush();

      expect(emailService.sendInvoice).toHaveBeenCalledTimes(1);
      const [tenantArg, invoiceArg] = emailService.sendInvoice.mock.calls[0];
      expect(tenantArg.id).toBe('tenant-a');
      expect(invoiceArg.status).toBe('paid');
      expect(invoiceArg.billingType).toBe('PIX');
    });

    test('nunca regride o currentPeriodEnd (renovação antecipada)', async () => {
      seedTenant();
      seedSubscription({
        status: 'ACTIVE',
        currentPeriodEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      });

      await subscriptionService.processWebhookEvent({
        type: 'payment.succeeded',
        subscriptionId: 'asaas-sub-9',
      });

      const updated = prisma.store.subscription[0];
      const daysAhead =
        (new Date(updated.currentPeriodEnd) - new Date()) / (24 * 60 * 60 * 1000);
      // Novo período = previous (20 dias) + 30 dias, não "agora + 30"
      expect(daysAhead).toBeGreaterThan(49);
    });

    test('retorna TENANT_NOT_FOUND quando não há assinatura correspondente', async () => {
      const result = await subscriptionService.processWebhookEvent({
        type: 'payment.succeeded',
        subscriptionId: 'asaas-desconhecido',
        tenantId: null,
      });

      expect(result.received).toBe(true);
      expect(result.error).toBe('TENANT_NOT_FOUND');
    });

    test('registra audit log da mutação', async () => {
      seedTenant();
      seedSubscription();

      await subscriptionService.processWebhookEvent({
        type: 'payment.succeeded',
        subscriptionId: 'asaas-sub-9',
      });
      await flush();

      const logs = prisma.store.auditLog;
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].action).toBe('UPDATE');
      expect(logs[0].entity).toBe('Subscription');
      expect(logs[0].tenantId).toBe('tenant-a');
      expect(logs[0].newValues.status).toBe('ACTIVE');
    });
  });

  // ═══════════════════════════════════════════════
  // PAYMENT_OVERDUE
  // ═══════════════════════════════════════════════
  describe('payment.past_due → PAST_DUE', () => {
    test('marca PAST_DUE, incrementa paymentAttempts e envia alerta', async () => {
      seedTenant();
      seedSubscription({ paymentAttempts: 1 });

      const result = await subscriptionService.processWebhookEvent({
        type: 'payment.past_due',
        subscriptionId: 'asaas-sub-9',
        value: 79.9,
        dueDate: '09/10/2026',
      });

      expect(result.received).toBe(true);
      expect(result.action).toBe('PAYMENT_PAST_DUE');

      const updated = prisma.store.subscription[0];
      expect(updated.status).toBe('PAST_DUE');
      expect(updated.paymentAttempts).toBe(2);

      await flush();
      expect(emailService.sendPaymentFailed).toHaveBeenCalledTimes(1);
      const [tenantArg, alertArg] = emailService.sendPaymentFailed.mock.calls[0];
      expect(tenantArg.id).toBe('tenant-a');
      expect(alertArg.paymentAttempts).toBe(2);
    });

    test('não desativa o tenant (grace period)', async () => {
      seedTenant();
      seedSubscription();

      await subscriptionService.processWebhookEvent({
        type: 'payment.past_due',
        subscriptionId: 'asaas-sub-9',
      });

      expect(prisma.store.tenant[0].active).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════
  // SUBSCRIPTION_SUSPENDED / CANCELED
  // ═══════════════════════════════════════════════
  describe('subscription.suspended → INCOMPLETE', () => {
    test('suspõe o acesso sem desativar o tenant', async () => {
      seedTenant();
      seedSubscription({ status: 'ACTIVE' });

      const result = await subscriptionService.processWebhookEvent({
        type: 'subscription.suspended',
        subscriptionId: 'asaas-sub-9',
      });

      expect(result.action).toBe('SUBSCRIPTION_SUSPENDED');
      expect(prisma.store.subscription[0].status).toBe('INCOMPLETE');
      // Suspensão administrativa NÃO desativa o tenant (diferente do cancelamento)
      expect(prisma.store.tenant[0].active).toBe(true);
    });
  });

  describe('subscription.canceled → CANCELED', () => {
    test('cancela a assinatura e desativa o tenant (bloqueio total)', async () => {
      seedTenant();
      seedSubscription({ status: 'ACTIVE' });

      const result = await subscriptionService.processWebhookEvent({
        type: 'subscription.canceled',
        subscriptionId: 'asaas-sub-9',
      });

      expect(result.action).toBe('SUBSCRIPTION_CANCELED');
      expect(prisma.store.subscription[0].status).toBe('CANCELED');
      expect(prisma.store.tenant[0].active).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════
  // REEMBOLSO / CHARGEBACK
  // ═══════════════════════════════════════════════
  describe('payment.refunded / payment.chargeback → CANCELED', () => {
    test.each(['payment.refunded', 'payment.chargeback'])(
      '%s cancela assinatura e desativa tenant',
      async (eventType) => {
        seedTenant();
        seedSubscription({ status: 'ACTIVE' });

        const result = await subscriptionService.processWebhookEvent({
          type: eventType,
          subscriptionId: 'asaas-sub-9',
        });

        expect(result.action).toBe('SUBSCRIPTION_CANCELED');
        expect(prisma.store.subscription[0].status).toBe('CANCELED');
        expect(prisma.store.tenant[0].active).toBe(false);
      }
    );
  });

  // ═══════════════════════════════════════════════
  // RESILIÊNCIA E RESOLUÇÃO DE TENANT
  // ═══════════════════════════════════════════════
  describe('Eventos não mapeados e resolução de tenant', () => {
    test('evento desconhecido é ignorado sem lançar erro', async () => {
      const result = await subscriptionService.processWebhookEvent({
        type: 'invoice.created',
        subscriptionId: 'x',
      });

      expect(result.received).toBe(true);
      expect(result.unhandled).toBe('invoice.created');
    });

    test('resolve tenant por asaasSubscriptionId quando tenantId não vem no evento', async () => {
      seedTenant();
      seedSubscription();

      const result = await subscriptionService.processWebhookEvent({
        type: 'subscription.suspended',
        subscriptionId: 'asaas-sub-9',
        tenantId: null, // força lookup no banco
      });

      expect(result.tenantId).toBe('tenant-a');
    });

    test('não permite cross-tenant: id desconhecido não afeta assinatura legítima', async () => {
      seedTenant();
      seedSubscription();

      const result = await subscriptionService.processWebhookEvent({
        type: 'subscription.canceled',
        subscriptionId: 'asaas-OUTRO-tenant', // id inexistente no banco
        tenantId: null,
      });

      expect(result.error).toBe('TENANT_NOT_FOUND');
      // A assinatura legítima NÃO foi alterada
      expect(prisma.store.subscription[0].status).toBe('INCOMPLETE');
    });
  });
});