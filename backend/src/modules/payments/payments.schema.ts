import { z } from 'zod';

/**
 * Schemas de validación del módulo Pagos (gateway + webhooks).
 * Multi-tenant: la suscripción se ubica por tenantId; el webhook llega
 * firmado con HMAC-SHA256 (PAYMENT_WEBHOOK_SECRET) e idempotente por
 * providerEventId.
 */

export const PLANS = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'] as const;
export const PROVIDERS = ['STRIPE', 'MERCADOPAGO', 'PAGARME', 'ASAAS', 'MANUAL'] as const;

type PlanLiteral = (typeof PLANS)[number];

/** Intento de checkout / cambio de plan gestionado por el ADMIN. */
export const createCheckoutSchema = z
  .object({
    plan: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
    // ID del cliente en el proveedor (si ya existe) — opcional.
    providerCustomerId: z.string().trim().max(255).optional(),
  })
  .strict();

/** Cancelación de la suscripción al final del período. */
export const cancelSubscriptionSchema = z
  .object({
    cancelAtPeriodEnd: z.boolean().default(true),
  })
  .strict();

/**
 * Petición del webhook: payload crudo (JSON firmado).
 * La firma se valida aparte con `PAYMENT_WEBHOOK_SECRET` (header).
 */
export const webhookEventSchema = z
  .object({
    // id del evento en el proveedor (idempotencia)
    id: z.string().trim().min(1).max(255),
    // tipo: checkout.session.completed | customer.subscription.updated | ...
    type: z.string().trim().min(1).max(160),
    data: z.object({
      // objeto de la suscripción en el proveedor
      subscriptionId: z.string().trim().max(255).optional(),
      customerId: z.string().trim().max(255).optional(),
      tenantId: z.string().uuid('Tenant ID must be a UUID').optional(),
      // plan solicitado (para checkout completado)
      plan: z.enum(PLANS).optional(),
      status: z.string().trim().max(255).optional(),
      currentPeriodStart: z.string().trim().optional(),
      currentPeriodEnd: z.string().trim().optional(),
      cancelAtPeriodEnd: z.boolean().optional(),
    }),
  })
  .strict();

export type CreateCheckoutInput = z.output<typeof createCheckoutSchema>;
export type CancelSubscriptionInput = z.output<typeof cancelSubscriptionSchema>;
export type WebhookEventInput = z.output<typeof webhookEventSchema>;
