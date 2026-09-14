import type { Request, Response } from 'express';
import { asyncHandler } from '../../middlewares/http.js';
import type { ValidatedRequest } from '../../types/http.js';
import { paymentsService } from './payments.service.js';
import type { CancelSubscriptionInput, CreateCheckoutInput, WebhookEventInput } from './payments.schema.js';

/** POST /api/v1/payments/checkout — cria/renova assinatura (ADMIN). */
export const checkout = asyncHandler(async (req: Request, res: Response) => {
  const body = (req as ValidatedRequest).validated.body as CreateCheckoutInput;
  const data = await paymentsService.checkout(body);
  res.json({ success: true, data });
});

/** PATCH /api/v1/payments/subscription/cancel — cancela no fim do período. */
export const cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
  const body = (req as ValidatedRequest).validated.body as CancelSubscriptionInput;
  const data = await paymentsService.cancelSubscription(body);
  res.json({ success: true, data });
});

/** GET /api/v1/payments/subscription — assinatura atual. */
export const getSubscription = asyncHandler(async (_req: Request, res: Response) => {
  const data = await paymentsService.getSubscription();
  res.json({ success: true, data });
});

/**
 * POST /api/v1/payments/webhook — ROTA PÚBLICA (firmada com HMAC).
 * O body é recebido como raw para validar a assinatura.
 */
export const webhook = asyncHandler(async (req: Request, res: Response) => {
  const rawBody = (req as unknown as { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {});
  const signature = req.headers['x-webhook-signature'] as string | undefined;
  const parsed = (req as ValidatedRequest).validated.body as WebhookEventInput;
  const data = await paymentsService.handleWebhook(rawBody, signature, parsed);
  res.json({ success: true, data });
});