import { requireTenantContext } from '../../shared/tenant-context.js';
import { ConflictError } from '../../shared/errors.js';
import type { AuthUser } from '../../types/http.js';
import {
  CustomerRepository,
  EntityNotFoundError,
} from './customers.repository.js';
import type {
  CreateCustomerInput,
  ListCustomersQuery,
  UpdateCustomerInput,
} from './customers.schema.js';

const repository = new CustomerRepository();

export const customerService = {
  /** Criação de cliente. RBAC: ADMIN/AGENT (rota). Owner default = criador. */
  async create(auth: AuthUser, input: CreateCustomerInput) {
    const { tenantId } = requireTenantContext();

    if (input.ownerId) {
      await assertValidOwner(input.ownerId);
    }

    return repository.create({
      ...input,
      tenantId,
      ownerId: input.ownerId ?? auth.userId,
    } as never);
  },

  /** Listagem paginada e filtrada, sempre scoped por tenant. */
  async list(auth: AuthUser, query: ListCustomersQuery) {
    const ownerId = query.owner === 'me' ? auth.userId : query.owner ?? undefined;

    const { rows, total } = await repository.list({
      status: query.status,
      ownerId,
      q: query.q,
      sort: query.sort,
      page: query.page,
      pageSize: query.pageSize,
    });

    return {
      rows,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  },

  /** Detalhe com contagem de deals/tickets (404 se fora do tenant). */
  async getById(_auth: AuthUser, id: string) {
    const customer = await repository.findById(id);
    if (!customer) throw new EntityNotFoundError('Customer', id);
    return customer;
  },

  /** Atualização parcial; valida owner se enviado. */
  async update(_auth: AuthUser, id: string, input: UpdateCustomerInput) {
    const existing = await repository.findById(id);
    if (!existing) throw new EntityNotFoundError('Customer', id);

    if ('ownerId' in input && input.ownerId) {
      await assertValidOwner(input.ownerId);
    }

    return repository.update(id, input as never);
  },

  /** Soft delete (solo ADMIN — RBAC en la ruta). */
  async remove(_auth: AuthUser, id: string): Promise<void> {
    const existing = await repository.findById(id);
    if (!existing) throw new EntityNotFoundError('Customer', id);
    await repository.softDelete(id);
  },
};

/** Garante que o owner indicado é ADMIN/AGENT ativo do próprio tenant. */
async function assertValidOwner(ownerId: string): Promise<void> {
  const owner = await repository.findAvailableOwner(ownerId);
  if (!owner) {
    throw new ConflictError(
      'Owner must be an active ADMIN or AGENT of this tenant',
      'INVALID_CUSTOMER_OWNER',
    );
  }
}