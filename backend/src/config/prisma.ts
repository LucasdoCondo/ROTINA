import { PrismaClient } from '@prisma/client';
import { applyTenantExtension } from '../shared/tenant-extension.js';
import { env } from './env.js';
import { logger } from '../shared/logger.js';

/**
 * Cliente Prisma global con la extensión de aislamiento multi-tenant aplicada.
 *
 * - `prisma`  -> cliente SCOPED: inyecta tenant_id según el AsyncLocalStorage.
 * - `root`    -> cliente RAÍZ (sin scope): SOLO para operaciones de sistema
 *                (verificación de tenant, migraciones, jobs cross-tenant).
 */
const root = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export const prisma = applyTenantExtension(root);

export async function pingDatabase(): Promise<boolean> {
  try {
    await root.$queryRawUnsafe('SELECT 1');
    return true;
  } catch (err) {
    logger.error({ err }, 'Database ping failed');
    return false;
  }
}