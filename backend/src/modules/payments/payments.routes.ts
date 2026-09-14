import { Router, type RequestHandler } from 'express';
import { validate } from '../../middlewares/http.js';
import { requireRole } from '../../middlewares/auth.js';
import { checkout, cancelSubscription, getSubscription, webhook } from './payments.controller.js';
import {
  cancelSubscriptionSchema,
  createCheckoutSchema,
  webhookEventSchema,
} from './payments.schema.js';

/**
 * Rotas de Pagamentos.
 *
 * - `/webhook` é PÚBLICA: o gateway envia eventos firmados com HMAC-SHA256.
 *   O body é capturado em `raw` para validar a assinatura antes do parsing.
 * - Demais rotas: autenticadas + multi-tenant (por v1.ts) e restritas a
 *   ADMIN (checkout/cancel) ou qualquer membro ativo (get).
 */
export const paymentsRoutes = Router();

/** Captura o raw body (necessário para validar HMAC do webhook). */
const captureRawBody: RequestHandler = (req, _res, next) => {
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    (req as unknown as { rawBody?: string }).rawBody = Buffer.concat(chunks).toString('utf8');
    next();
  });
  req.on('error', next);
};

// Webhook público (sem auth — validado por assinatura HMAC)
paymentsRoutes.post(
  '/webhook',
  captureRawBody,
  validate(webhookEventSchema, 'body'),
  webhook,
);

// Assinatura autenticada
paymentsRoutes.get('/subscription', getSubscription);
paymentsRoutes.post('/checkout', requireRole('ADMIN'), validate(createCheckoutSchema, 'body'), checkout);
paymentsRoutes.patch(
  '/subscription/cancel',
  requireRole('ADMIN'),
  validate(cancelSubscriptionSchema, 'body'),
  cancelSubscription,
);