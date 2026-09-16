import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { requireTenantContext } from '../../shared/tenant-context.js';
import { ForbiddenError, NotFoundError, UnprocessableEntityError } from '../../shared/errors.js';
import { logger } from '../../shared/logger.js';
import { queueEmail } from '../../queues/email.queue.js';
import { queueNotification } from '../../queues/notification.queue.js';
import {
  PaymentEventRepository,
  SubscriptionPaymentRepository,
} from './payments.repository.js';
import type { CreateCheckoutInput, WebhookEventInput } from './payments.schema.js';

/**
 * Serviço de Pagamentos — gateway + webhooks para assinaturas do SaaS.
 *
 * O gateway real (Stripe/MercadoPago/PagarMe) fica atrás de um "adapter"
 * mínimo. Em modo MANUAL (default dev) o checkout apenas atualiza a
 * Subscription local, permitindo contratar planos no app sem gateway.
 *
 * Webhooks: chegada pública firmada com HMAC-SHA256 (PAYMENT_WEBHOOK_SECRET)
 * e idempotente por providerEventId (PaymentEvent).
 */

const tenantRepo = new SubscriptionPaymentRepository();
const eventRepo = new PaymentEventRepository();

/** Par de chaves por provider (futuro adapter). */
const KEY_MAP: Record<string, string> = {
  STRIPE: env.PAYMENT_WEBHOOK_SECRET,
  MERCADOPAGO: env.PAYMENT_WEBHOOK_SECRET,
  PAGARME: env.PAYMENT_WEBHOOK_SECRET,
  ASAAS: env.ASAAS_WEBHOOK_TOKEN ?? env.PAYMENT_WEBHOOK_SECRET,
};

const PLAN_TO_TENANT: Record<string, 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'> = {
  FREE: 'FREE',
  STARTER: 'STARTER',
  PROFESSIONAL: 'PROFESSIONAL',
  ENTERPRISE: 'ENTERPRISE',
};

function toDate(v?: string): Date {
  const ms = v ? Date.parse(v) : Number.NaN;
  return Number.isFinite(ms) ? new Date(ms) : new Date(Date.now() + 30 * 86_400_000);
}

/** Valida a assinatura HMAC-SHA256 do webhook (comparação em tempo constante). */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | undefined): boolean {
  if (!signatureHeader) return false;
  const provider = (env.PAYMENT_PROVIDER || 'MANUAL') as string;
  const secret = KEY_MAP[provider] ?? env.PAYMENT_WEBHOOK_SECRET;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

  // formatos: "sha256=<hex>" (Stripe) ou apenas <hex>
  const provided = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice('sha256='.length)
    : signatureHeader;

  try {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(provided, 'utf8');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const paymentsService = {
  /**
   * Checkout: cria/renova a Subscription do tenant e sincroniza o plano
   * no Tenant. Retorna URL do gateway de pagamento (ou null em MANUAL).
   */
  async checkout(input: CreateCheckoutInput) {
    const { tenantId } = requireTenantContext();
    const current = await tenantRepo.findCurrent();

    const provider = env.PAYMENT_PROVIDER as 'STRIPE' | 'MERCADOPAGO' | 'PAGARME' | 'ASAAS' | 'MANUAL';

    const data = {
      tenantId,
      plan: input.plan,
      status: 'ACTIVE',
      provider,
      providerCustomerId: input.providerCustomerId ?? current?.providerCustomerId ?? null,
      // ids fake determinísticos para dev/demo
      providerSubscriptionId:
        current?.providerSubscriptionId ?? `sub_${crypto.randomUUID().replaceAll('-', '')}`.slice(0, 40),
      externalId: current?.externalId ?? crypto.randomUUID(),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
      cancelAtPeriodEnd: false,
    };

    const subscription = await tenantRepo.upsert(data as never);

    // Sincroniza o plano no Tenant
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { plan: PLAN_TO_TENANT[input.plan] ?? 'FREE' },
    });

    // Fila: notifica mudança de plano
    await queueNotification({
      tenantId,
      channel: 'inapp',
      kind: 'plan',
      title: `Plano alterado para ${input.plan}`,
      body: `Sua assinatura agora é o plano ${input.plan}.`,
    });

    // Em MANUAL não há URL de pagamento externo
    const checkoutUrl =
      provider === 'MANUAL'
        ? null
        : `${env.PAYMENT_WEBHOOK_URL || 'http://localhost:3000/api/v1/payments/webhook'}?plan=${input.plan}`;

    return { subscription, checkoutUrl };
  },
/** Cancela no final do período atual. */
  async cancelSubscription(input: { cancelAtPeriodEnd: boolean }) {
    const { tenantId } = requireTenantContext();
    const current = await tenantRepo.findCurrent();
    if (!current) throw new NotFoundError('Subscription not found');

    return tenantRepo.update(current.id, {
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      ...(input.cancelAtPeriodEnd ? { canceledAt: new Date() } : { canceledAt: null }),
    });
  },

  /** Detalhe da assinatura (para a UI de planos). */
  async getSubscription() {
    const { tenantId } = requireTenantContext();
    const current = await tenantRepo.findCurrent();
    if (!current) throw new NotFoundError('Subscription not found');
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    return { subscription: current, tenantPlan: tenant?.plan };
  },

  /**
   * Webhook do gateway — rota PÚBLICA. Valida assinatura, registra event
   * (idempotente por providerEventId) e aplica a mutação correspondente.
   */
  async handleWebhook(rawBody: string, signatureHeader: string | undefined, parsed: WebhookEventInput) {
    if (env.PAYMENT_PROVIDER !== 'MANUAL') {
      if (!verifyWebhookSignature(rawBody, signatureHeader)) {
        throw new ForbiddenError('Invalid webhook signature');
      }
    }

    // Idempotência: se o evento já foi processado, retorna sucesso silencioso.
    const existing = await eventRepo.findById(parsed.id);
    if (existing && existing.status === 'processed') {
      return { skipped: true };
    }

    let event;
    try {
      // Registra o evento primeiro (received) — se o providerEventId duplicar,
      // o unique constraint rejeita e tratamos como já-processado.
      event = await eventRepo.create({
        tenantId: parsed.data.tenantId ?? null,
        eventType: parsed.type,
        providerEventId: parsed.id,
        payload: parsed as never,
      });
    } catch (err) {
      const code = (err as { code?: string }).code;
      // P2002 = unique violation → evento duplicado (destroy no-op)
      if (code === 'P2002') {
        return { skipped: true };
      }
      throw err;
    }

    try {
      await applyWebhookEvent(parsed);
      await eventRepo.markProcessed(event.id);
      return { skipped: false };
    } catch (err) {
      await eventRepo.markFailed(event.id, err instanceof Error ? err.message : 'Unknown');
      throw err;
    }
  },
};

async function applyWebhookEvent(event: WebhookEventInput): Promise<void> {
  const { subscriptionId, tenantId, plan, status, currentPeriodEnd } = event.data;

  if (!subscriptionId && !tenantId) {
    throw new UnprocessableEntityError('Webhook event missing subscription or tenant reference');
  }

  const data = {
    ...(status ? { status: mapProviderStatus(status) } : {}),
    ...(plan ? { plan: plan as 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' } : {}),
    ...(currentPeriodEnd ? { currentPeriodEnd: toDate(currentPeriodEnd) } : {}),
    ...(subscriptionId ? { providerSubscriptionId: subscriptionId } : {}),
  };

  if (subscriptionId && event.data.customerId) {
    const updated = await tenantRepo.updateByProviderSubscriptionId(subscriptionId, {
      ...data,
      providerCustomerId: event.data.customerId,
    });
    if (updated) {
      await queueEmail({
        to: 'billing@rotina.dev', // substituir pelo email real do tenant
        subject: `Assinatura atualizada (${plan ?? status ?? ''})`,
        template: 'plan-change',
        data: { subscriptionId, status, plan },
        dedupeKey: `webhook-sub-${subscriptionId}-${event.id}`,
      });
      return;
    }
  }

  if (tenantId) {
    await prisma.subscription.updateMany({
      where: { tenantId },
      data: {
        ...data,
        providerSubscriptionId: subscriptionId ?? undefined,
        providerCustomerId: event.data.customerId ?? undefined,
      },
    });
  }

  logger.info({ eventId: event.id, type: event.type }, 'Webhook aplicado');
}

function mapProviderStatus(
  providerStatus: string,
): 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' {
  const s = providerStatus.toUpperCase();
  if (s.includes('CANCEL') || s.includes('UNPAID')) return 'CANCELED';
  if (s.includes('PAST_DUE') || s.includes('INCOMPLETE')) return 'PAST_DUE';
  if (s.includes('TRIAL')) return 'TRIALING';
  if (s.includes('EXPIRED')) return 'EXPIRED';
  return 'ACTIVE';
}
