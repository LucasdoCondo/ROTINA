import { Prisma, type PrismaClient } from '@prisma/client';
import { getTenantContext } from './tenant-context.js';

/**
 * EXTENSIÓN DE AISLAMIENTO MULTI-TENANT (defensa en profundidad, capa 2).
 *
 * Inyecta `tenant_id` en TODAS las operaciones ejecutadas dentro de un
 * contexto de tenant (AsyncLocalStorage). Así, aunque un servicio/repositorio
 * olvide filtrar, la query queda acotada al tenant de la request.
 *
 * Semántica por operación:
 *  - create / createMany ............ inyecta tenant_id en el payload.
 *  - findMany/findFirst/count/... ... mezcla tenant_id en el where.
 *  - update / delete (where único) → se traducen a updateMany/deleteMany
 *    sobre el cliente raíz CON tenant_id mezclado; devuelven { count }.
 *  - findUnique/findUniqueOrThrow → se traducen a findFirst(findFirstOrThrow)
 *    también con tenant_id mezclado.
 *  - updateMany / deleteMany ........ mezcla tenant_id en el where.
 *  - upsert ......................... tenso: se inyecta tenant_id en create/
 *    update y se mezcla where; para patrones upsert sanos usa repos/servicios.
 *
 * Los repositorios del proyecto usan SIEMPRE findFirst/updateMany/deleteMany;
 * las traducciones de operaciones únicas son solo una red de seguridad.
 *
 * NOTA de tipado: la manipulación de `args` usa un tipo local permissive
 * porque Prisma expone un union gigante de Args por operación.
 */

const TENANT_SCOPED_MODELS = new Set<string>([
  'User',
  'RefreshToken',
  'Ticket',
  'Customer',
  'Deal',
  'TicketMessage',
]);

type QueryFn = (args: unknown) => Promise<unknown>;

export function applyTenantExtension(root: PrismaClient): PrismaClient {
  const extended = root.$extends({
    name: 'tenantIsolation',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const ctx = getTenantContext();
          if (!ctx || !TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }
          return scopeOperation(root, model, operation, args, query as QueryFn, ctx.tenantId);
        },
      },
    },
  });
  return extended as unknown as PrismaClient;
}

/** Vista permissiva de los args que manipulamos (ver nota de tipado). */
interface LooseArgs {
  data?: unknown;
  where?: Record<string, unknown> | null;
  create?: Record<string, unknown>;
  update?: Record<string, unknown>;
}

/** Delegate del cliente raíz (sin extensión), con tipado suelto. */
function rootDelegate(
  root: PrismaClient,
  model: string,
): Record<string, unknown> {
  return (root as unknown as Record<string, Record<string, unknown>>)[model] ?? {};
}

async function scopeOperation(
  root: PrismaClient,
  model: string,
  operation: string,
  args: unknown,
  query: QueryFn,
  tenantId: string,
): Promise<unknown> {
  const a = args as LooseArgs;

  switch (operation) {
    case 'create': {
      a.data = { ...(a.data as Record<string, unknown>), tenantId };
      return query(args);
    }

    case 'createMany': {
      const rows = Array.isArray(a.data) ? a.data : [a.data];
      a.data = rows.map((row) => ({ ...(row as Record<string, unknown>), tenantId }));
      return query(args);
    }

    case 'findUnique':
    case 'findUniqueOrThrow': {
      const merged = { ...(a.where ?? {}), tenantId };
      const method = operation === 'findUnique' ? 'findFirst' : 'findFirstOrThrow';
      return (rootDelegate(root, model)[method] as (x: unknown) => Promise<unknown>)({
        ...(args as object),
        where: merged,
      });
    }

    case 'update':
    case 'delete': {
      const merged = { ...(a.where ?? {}), tenantId };
      const method = operation === 'update' ? 'updateMany' : 'deleteMany';
      return (rootDelegate(root, model)[method] as (x: unknown) => Promise<unknown>)({
        ...(args as object),
        where: merged,
      });
    }

    case 'upsert': {
      const merged = { ...(a.where ?? {}), tenantId };
      return (rootDelegate(root, model).upsert as (x: unknown) => Promise<unknown>)({
        ...(args as object),
        where: merged,
        create: { ...(a.create ?? {}), tenantId },
        update: { ...(a.update ?? {}), tenantId },
      });
    }

    case 'findMany':
    case 'findFirst':
    case 'findFirstOrThrow':
    case 'count':
    case 'aggregate':
    case 'groupBy':
    case 'updateMany':
    case 'deleteMany': {
      a.where = { ...(a.where ?? {}), tenantId };
      return query(args);
    }

    default:
      return query(args);
  }
}