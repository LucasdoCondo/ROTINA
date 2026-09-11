import { prisma } from '../config/prisma.js';
import type { TenantStatusValue } from '../domain/constants.js';

/**
 * Caché en memoria (TTL corto) del estado de actividad de cada tenant.
 * Evita una consulta a la BD por request. En clusters multi-instancia se
 * sustituiría por Redis (TTL ~30s) — roadmap de escalado.
 */
interface CacheEntry {
  active: boolean;
  expiresAt: number;
}

const TTL_MS = 30_000;
const cache = new Map<string, CacheEntry>();

export const tenantCache = {
  async isActive(tenantId: string): Promise<boolean> {
    const hit = cache.get(tenantId);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.active;
    }

    // El modelo Tenant NO está scoped por tenant: se consulta con el cliente raíz.
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, status: true, deletedAt: true },
    });

    const active =
      tenant !== null &&
      tenant.deletedAt === null &&
      (tenant.status as TenantStatusValue) === 'ACTIVE';

    cache.set(tenantId, { active, expiresAt: Date.now() + TTL_MS });
    return active;
  },

  invalidate(tenantId: string): void {
    cache.delete(tenantId);
  },
};