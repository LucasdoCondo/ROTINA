import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { TenantAwareRepository, EntityNotFoundError } from '../../shared/tenant-repository.js';
import { ConflictError } from '../../shared/errors.js';
import type { CustomerStatusValue } from '../../domain/constants.js';

/** Relaciones siempre anexadas al cliente (sin campos sensibles). */
export const CUSTOMER_INCLUDE = {
  owner: { select: { id: true, name: true, email: true } },
  _count: { select: { deals: true, tickets: true } },
} satisfies Prisma.CustomerInclude;

export type CustomerWithRelations = Prisma.CustomerGetPayload<{
  include: typeof CUSTOMER_INCLUDE;
}>;

export interface CustomerListCriteria {
  status?: CustomerStatusValue;
  ownerId?: string;
  q?: string;
  sort: 'newest' | 'oldest' | 'name';
  page: number;
  pageSize: number;
}

/** Traduce P2002 (violación de unique) en 409 tipado para el dominio CRM. */
export function mapCustomerUniqueError(err: unknown): never | void {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    throw new ConflictError('Customer email already in use in this tenant', 'CUSTOMER_EMAIL_TAKEN');
  }
}

/**
 * Repositorio de clientes: CADA método cruza explícitamente
 * `{ tenantId, deletedAt: null }` (reforzado además por la extensión Prisma).
 */
export class CustomerRepository extends TenantAwareRepository {
  async findById(id: string): Promise<CustomerWithRelations | null> {
    return prisma.customer.findFirst({
      where: this.whereActive(id),
      include: CUSTOMER_INCLUDE,
    });
  }

  async list(criteria: CustomerListCriteria): Promise<{ rows: CustomerWithRelations[]; total: number }> {
    const where: Prisma.CustomerWhereInput = {
      tenantId: this.tenantId,
      deletedAt: null,
    };

    if (criteria.status) where.status = criteria.status;
    if (criteria.ownerId) where.ownerId = criteria.ownerId;
    if (criteria.q) {
      where.OR = [
        { name: { contains: criteria.q, mode: 'insensitive' } },
        { email: { contains: criteria.q, mode: 'insensitive' } },
        { company: { contains: criteria.q, mode: 'insensitive' } },
        { document: { contains: criteria.q } },
      ];
    }

    const orderBy: Prisma.CustomerOrderByWithRelationInput[] =
      criteria.sort === 'newest'
        ? [{ createdAt: 'desc' }]
        : criteria.sort === 'oldest'
          ? [{ createdAt: 'asc' }]
          : [{ name: 'asc' }];

    const skip = (criteria.page - 1) * criteria.pageSize;
    const take = criteria.pageSize;

    const [rows, total] = await prisma.$transaction([
      prisma.customer.findMany({ where, include: CUSTOMER_INCLUDE, orderBy, skip, take }),
      prisma.customer.count({ where }),
    ]);

    return { rows, total };
  }

  /** Valida que el owner sea un ADMIN/AGENT activo del MISMO tenant. */
  async findAvailableOwner(ownerId: string) {
    return prisma.user.findFirst({
      where: {
        id: ownerId,
        tenantId: this.tenantId,
        deletedAt: null,
        role: { in: ['ADMIN', 'AGENT'] },
        status: 'ACTIVE',
      },
      select: { id: true, name: true, role: true },
    });
  }

  async create(data: Prisma.CustomerUncheckedCreateInput): Promise<CustomerWithRelations> {
    try {
      return await prisma.customer.create({ data, include: CUSTOMER_INCLUDE });
    } catch (err) {
      mapCustomerUniqueError(err);
      throw err;
    }
  }

  async update(
    id: string,
    data: Prisma.CustomerUncheckedUpdateInput,
  ): Promise<CustomerWithRelations> {
    try {
      await prisma.customer.updateMany({
        where: { ...this.whereOwned(id), deletedAt: null },
        data,
      });
    } catch (err) {
      mapCustomerUniqueError(err);
      throw err;
    }

    const updated = await this.findById(id);
    if (!updated) {
      throw new EntityNotFoundError('Customer', id);
    }
    return updated;
  }

  /** Soft delete (deleted_at = now). Solo ADMIN vía RBAC en la ruta. */
  async softDelete(id: string): Promise<void> {
    await prisma.customer.updateMany({
      where: { ...this.whereOwned(id), deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}

// Re-export para reuso tipado en servicios.
export { EntityNotFoundError };