import { prisma } from '../../config/prisma.js';
import { requireTenantContext } from '../../shared/tenant-context.js';
import { NotFoundError } from '../../shared/errors.js';
import { logger } from '../../shared/logger.js';
import { tenantCache } from '../../shared/tenant-cache.js';
import type { UpdateTenantInput } from './tenants.schema.js';

export const tenantsService = {
  /**
   * Devuelve el tenant actual (siempre dentro de la request scoped).
   * El modelo Tenant no es scoped por la extensión, así que el where explícito
   * se construye con el tenantId del contexto (AsyncLocalStorage).
   */
  async getMyTenant() {
    const { tenantId } = requireTenantContext();

    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        status: true,
        contactEmail: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!tenant) throw new NotFoundError('Tenant not found');
    return tenant;
  },

  /** Actualiza datos generales del tenant (solo ADMIN via ruta RBAC). */
  async updateMyTenant(input: UpdateTenantInput) {
    const { tenantId } = requireTenantContext();

    const updated = await prisma.tenant.updateMany({
      where: { id: tenantId, deletedAt: null },
      data: input,
    });
    if (updated.count === 0) throw new NotFoundError('Tenant not found');

    logger.info({ tenantId }, 'Tenant profile updated');
    tenantCache.invalidate(tenantId);

    return this.getMyTenant();
  },
};