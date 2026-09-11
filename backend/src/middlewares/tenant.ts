import type { RequestHandler } from 'express';
import { BadRequestError, ForbiddenError, UnauthorizedError } from '../shared/errors.js';
import { tenantCache } from '../shared/tenant-cache.js';
import { runWithTenant } from '../shared/tenant-context.js';
import type { AuthUser } from '../types/http.js';

/**
 * MIDDLEWARE DE AISLAMIENTO MULTI-TENANT (capa 1).
 *
 * Extrae el tenant_id de, en orden:
 *   1. Claim `tenantId` del access token JWT (ya verificado por authRequired).
 *   2. Header `x-tenant-id` (integración API-Key / servicios de sistema).
 *
 * Validaciones:
 *   - Formato UUID v4.
 *   - Consistencia si ambas fuentes están presentes (token vs header).
 *   - El tenant existe y está `ACTIVE` (con caché TTL para no golpear la BD
 *     en cada request).
 *
 * A continuación lanza el manejador dentro de AsyncLocalStorage con el
 * contexto, para que la extensión de Prisma escopie absolutamente todas las
 * queries del request.
 */

const TENANT_HEADER = 'x-tenant-id';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const tenantIsolation: RequestHandler = async (req, _res, next) => {
  try {
    const candidates: string[] = [];

    const auth = (req as { auth?: AuthUser }).auth;
    if (auth?.tenantId) candidates.push(auth.tenantId);

    const header = req.headers[TENANT_HEADER];
    if (typeof header === 'string' && header.trim().length > 0) {
      candidates.push(header.trim());
    }

    if (candidates.length === 0) {
      throw new UnauthorizedError(
        'Tenant context missing: provide a valid token or x-tenant-id header',
      );
    }

    const unique = [...new Set(candidates)];
    if (unique.length > 1) {
      throw new BadRequestError('Tenant mismatch between token and x-tenant-id header');
    }

    const tenantId = unique[0]!;
    if (!UUID_RE.test(tenantId)) {
      throw new BadRequestError('Invalid tenant_id format (expected UUID)');
    }

    if (!(await tenantCache.isActive(tenantId))) {
      throw new ForbiddenError('Tenant is not active or does not exist');
    }

    runWithTenant({ tenantId }, () => {
      (req as { tenant?: { id: string } }).tenant = { id: tenantId };
      next();
    });
  } catch (err) {
    next(err);
  }
};