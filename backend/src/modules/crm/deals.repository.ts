import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { TenantAwareRepository, EntityNotFoundError } from '../../shared/tenant-repository.js';
import type { DealStageValue } from '../../domain/constants.js';

/** Relaciones siempre anexadas a la negociación (sin campos sensibles). */
export const DEAL_INCLUDE = {
  customer: { select: { id: true, name: true, company: true, status: true } },
  owner: { select: { id: true, name: true, email: true } },
} satisfies Prisma.DealInclude;

export type DealWithRelations = Prisma.DealGetPayload<{
  include: typeof DEAL_INCLUDE;
}>;

export interface DealListCriteria {
  stage?: DealStageValue;
  customerId?: string;
  ownerId?: string;
  q?: string;
  sort: 'newest' | 'oldest' | 'value' | 'expected';
  page: number;
  pageSize: number;
}

export interface FunnelStageSummary {
  stage: DealStageValue;
  count: number;
  total: number; // soma de value em unidades monetárias (string Decimal → number)
}

/**
 * Repositorio de negociaciones: CADA método cruza explícitamente
 * `{ tenantId, deletedAt: null }` (reforzado además por la extensión Prisma).
 */
export class DealRepository extends TenantAwareRepository {
  async findById(id: string): Promise<DealWithRelations | null> {
    return prisma.deal.findFirst({
      where: this.whereActive(id),
      include: DEAL_INCLUDE,
    });
  }

  async list(criteria: DealListCriteria): Promise<{ rows: DealWithRelations[]; total: number }> {
    const where: Prisma.DealWhereInput = {
      tenantId: this.tenantId,
      deletedAt: null,
    };

    if (criteria.stage) where.stage = criteria.stage;
    if (criteria.customerId) where.customerId = criteria.customerId;
    if (criteria.ownerId) where.ownerId = criteria.ownerId;
    if (criteria.q) {
      where.OR = [
        { title: { contains: criteria.q, mode: 'insensitive' } },
        { customer: { name: { contains: criteria.q, mode: 'insensitive' } } },
      ];
    }

    const orderBy: Prisma.DealOrderByWithRelationInput[] =
      criteria.sort === 'newest'
        ? [{ createdAt: 'desc' }]
        : criteria.sort === 'oldest'
          ? [{ createdAt: 'asc' }]
          : criteria.sort === 'value'
            ? [{ value: 'desc' }]
            : [{ expectedCloseAt: 'asc' }];

    const skip = (criteria.page - 1) * criteria.pageSize;
    const take = criteria.pageSize;

    const [rows, total] = await prisma.$transaction([
      prisma.deal.findMany({ where, include: DEAL_INCLUDE, orderBy, skip, take }),
      prisma.deal.count({ where }),
    ]);

    return { rows, total };
  }

  /**
   * Funil agregado: contagem e soma de valor por estágio (uma query groupBy).
   * Retorna um slot por estágio conhecido, inclusive vazios (para a UI).
   */
  async funnel(stages: readonly DealStageValue[]): Promise<FunnelStageSummary[]> {
    const grouped = await prisma.deal.groupBy({
      by: ['stage'],
      where: { tenantId: this.tenantId, deletedAt: null },
      _count: { _all: true },
      _sum: { value: true },
    });

    const byStage = new Map(grouped.map((g) => [g.stage, g]));

    return stages.map((stage) => {
      const g = byStage.get(stage);
      return {
        stage,
        count: g?._count._all ?? 0,
        total: g?._sum.value ? Number(g._sum.value) : 0,
      };
    });
  }

  /** Valida que o customer existe (e não está removido) no tenant. */
  async findCustomer(customerId: string) {
    return prisma.customer.findFirst({
      where: { id: customerId, tenantId: this.tenantId, deletedAt: null },
      select: { id: true, name: true },
    });
  }

  /** Valida que o owner é um ADMIN/AGENT ativo do MISMO tenant. */
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

  async create(data: Prisma.DealUncheckedCreateInput): Promise<DealWithRelations> {
    return prisma.deal.create({ data, include: DEAL_INCLUDE });
  }

  /** Atualiza (inclui mudança de estágio) e recarrega com relaciones. */
  async update(id: string, data: Prisma.DealUncheckedUpdateInput): Promise<DealWithRelations> {
    await prisma.deal.updateMany({
      where: { ...this.whereOwned(id), deletedAt: null },
      data,
    });

    const updated = await this.findById(id);
    if (!updated) throw new EntityNotFoundError('Deal', id);
    return updated;
  }

  /** Soft delete (deleted_at = now). Solo ADMIN vía RBAC en la ruta. */
  async softDelete(id: string): Promise<void> {
    await prisma.deal.updateMany({
      where: { ...this.whereOwned(id), deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}