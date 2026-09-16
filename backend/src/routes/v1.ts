import { Router, type RequestHandler } from 'express';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { internalRoutes } from './internal.js';
import { tenantsRoutes } from '../modules/tenants/tenants.routes.js';
import { ticketsRoutes } from '../modules/tickets/tickets.routes.js';
import { crmRoutes } from '../modules/crm/crm.routes.js';
import { membersRoutes } from '../modules/members/members.routes.js';
import { ecommerceRoutes } from '../modules/ecommerce/ecommerce.routes.js';
import { paymentsRoutes } from '../modules/payments/payments.routes.js';
import { authRequired } from '../middlewares/auth.js';
import { tenantIsolation } from '../middlewares/tenant.js';
import { apiRateLimiter, healthLimiter, authRateLimiter } from '../middlewares/rate-limit.js';
import { pingDatabase } from '../config/prisma.js';
import { asyncHandler, validate } from '../middlewares/http.js';
import { acceptInvitation } from '../modules/members/members.controller.js';
import { acceptInvitationSchema } from '../modules/members/members.schema.js';

/** GET /api/v1/health — sondeo de liveness + DB. */
const health: RequestHandler = asyncHandler(async (_req, res) => {
  const db = await pingDatabase();
  res.status(db ? 200 : 503).json({
    success: true,
    data: { status: db ? 'ok' : 'degraded', database: db ? 'up' : 'down', ts: new Date() },
  });
});

export const v1Router = Router();

// Endpoints públicos
v1Router.get('/health', healthLimiter, health);
v1Router.use('/auth', authRoutes);

// Aceite de convite — público (validado pelo token do convite, não por JWT).
v1Router.post(
  '/members/invitations/accept',
  authRateLimiter,
  validate(acceptInvitationSchema, 'body'),
  acceptInvitation,
);

// Webhook de pagamentos — público (validado por assinatura HMAC, não por JWT).
v1Router.use('/payments/webhook', paymentsRoutes);

// Jobs internos (Vercel Cron / OCI) — públicos, porém protegidos por segredo
// compartilhado (Authorization: Bearer CRON_SECRET ou x-internal-secret).
v1Router.use('/internal', internalRoutes);

// ─── A partir de aquí: AUTENTICACIÓN + AISLAMIENTO MULTI-TENANT ───
// 1) Verifica el JWT y adjunta claims (req.auth).
// 2) Limita por tenant/IP (las rutas públicas ya tienen su propio límite).
// 3) Extrae y valida tenant_id (JWT o x-tenant-id) y abre el scope ALS.
v1Router.use(authRequired);
v1Router.use(apiRateLimiter);
v1Router.use(tenantIsolation);

// Módulos scoped por tenant
v1Router.use('/tenants', tenantsRoutes);
v1Router.use('/crm', crmRoutes);
v1Router.use('/tickets', ticketsRoutes);
v1Router.use('/members', membersRoutes);
v1Router.use('/ecommerce', ecommerceRoutes);
v1Router.use('/payments', paymentsRoutes);