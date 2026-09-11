import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { TooManyRequestsError } from '../shared/errors.js';

/**
 * Rate limiting por TENANT (o IP como fallback).
 * El límite general protege contra abuso por parte de un tenant completo,
 * mientras que el límite de auth golpea por IP para endurecer login/register.
 */

function tenantOrIpKey(req: { ip?: string; auth?: { tenantId?: string } }): string {
  const tenantId = (req.auth as { tenantId?: string } | undefined)?.tenantId;
  if (tenantId) return `t:${tenantId}`;
  return `ip:${req.ip ?? 'unknown'}`;
}

/** Límite global de API aplicado por tenant (o IP si no autenticado). */
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: tenantOrIpKey,
  handler: (_req, _res) => {
    throw new TooManyRequestsError();
  },
});

/** Límite ligero para el endpoint público de health (por IP). */
export const healthLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `health:${req.ip ?? 'unknown'}`,
  handler: (_req, _res) => {
    throw new TooManyRequestsError();
  },
});

/** Límite estricto para endpoints de autenticación, por IP. */
export const authRateLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `auth:${req.ip ?? 'unknown'}`,
  handler: (_req, _res) => {
    throw new TooManyRequestsError('Too many auth attempts, try later');
  },
});