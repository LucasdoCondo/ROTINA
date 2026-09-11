import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Contexto multi-tenant por request, almacenado en AsyncLocalStorage.
 *
 * El middleware `tenantIsolation` establece el contexto al comienzo del ciclo
 * de vida de la request. Cualquier await dentro de ese flujo hereda el
 * contexto, de modo que la extensión de Prisma puede inyectar `tenant_id`
 * de forma transparente en todas las queries.
 */

export interface TenantContext {
  tenantId: string;
}

const storage = new AsyncLocalStorage<TenantContext>();

/** Devuelve el contexto del tenant actual (undefined fuera de una request scoped). */
export function getTenantContext(): TenantContext | undefined {
  return storage.getStore();
}

/** Ejecuta `fn` dentro del contexto de tenant dado. */
export function runWithTenant<T>(ctx: TenantContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

/** Lanza un error si no hay contexto de tenant (protección para repositorios). */
export function requireTenantContext(): TenantContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error('TenantContext ausente: se requiere contexto multi-tenant para esta operación.');
  }
  return ctx;
}