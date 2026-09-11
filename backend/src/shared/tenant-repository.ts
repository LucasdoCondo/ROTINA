import { requireTenantContext } from './tenant-context.js';
import { NotFoundError } from './errors.js';

/**
 * Base de repositorios tenant-aware (capa 3 del aislamiento multi-tenant).
 *
 * Todos los accesos de escritura/lectura de un repositorio de negocio deben
 * pasar por estos helpers, que SIEMPRE cruzan `{ id, tenantId }` de forma
 * explícita. La extensión de Prisma mantiene el cumplimiento como red de
 * seguridad, pero aquí la intención es visible en el código.
 */
export abstract class TenantAwareRepository {
  /** tenant_id del contexto actual (lanza si se invoca fuera de request scoped). */
  protected get tenantId(): string {
    return requireTenantContext().tenantId;
  }

  /** Build del where canónico `{ id, tenantId }`. */
  protected whereOwned(id: string): { id: string; tenantId: string } {
    return { id, tenantId: this.tenantId };
  }

  /** where propio + soft-delete activo (deleted_at IS NULL). */
  protected whereActive(id: string): { id: string; tenantId: string; deletedAt: null } {
    return { ...this.whereOwned(id), deletedAt: null };
  }
}

/** Error tipado para "no encontrado dentro del tenant" (evita oráculos). */
export class EntityNotFoundError extends NotFoundError {
  constructor(entity: string, id: string) {
    super(`${entity} not found or not accessible in this tenant`);
    void id; // el id se omite del mensaje para no exponer datos en logs
  }
}