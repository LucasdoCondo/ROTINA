import { prisma } from '../../config/prisma.js';
import { requireTenantContext } from '../../shared/tenant-context.js';
import { TenantAwareRepository, EntityNotFoundError } from '../../shared/tenant-repository.js';
import type { Prisma, User } from '@prisma/client';

/**
 * Repositório de Membros — isolado por tenant_id.
 * Todas as queries cruzam `{ tenantId }` explicitamente.
 */
export class MemberRepository extends TenantAwareRepository {
  async list(query: {
    page: number;
    pageSize: number;
    role?: string;
    status?: string;
    q?: string;
    sort: string;
  }): Promise<{ rows: User[]; total: number }> {
    const { page, pageSize, role, status, q, sort } = query;
    const where: Prisma.UserWhereInput = {
      tenantId: this.tenantId,
      deletedAt: null,
      ...(role ? { role: role as Prisma.EnumUserRoleFilter['equals'] } : {}),
      ...(status ? { status: status as Prisma.EnumUserStatusFilter['equals'] } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.UserOrderByWithRelationInput =
      sort === 'oldest' ? { createdAt: 'asc' } : sort === 'name' ? { name: 'asc' } : { createdAt: 'desc' };

    const [rows, total] = await Promise.all([
      prisma.user.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.user.count({ where }),
    ]);

    return { rows, total };
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findFirst({ where: this.whereActive(id) });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { tenantId: this.tenantId, email, deletedAt: null },
    });
  }

  async create(data: Prisma.UserUncheckedCreateInput): Promise<User> {
    return prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: this.whereOwned(id), data });
  }

  async softDelete(id: string): Promise<void> {
    await prisma.user.updateMany({ where: this.whereActive(id), data: { deletedAt: new Date() } });
  }

  /** Contagem de membros ativos (para métricas/dashboard). */
  async countActive(): Promise<number> {
    return prisma.user.count({
      where: { tenantId: this.tenantId, deletedAt: null, status: 'ACTIVE' },
    });
  }
}

/**
 * Repositório de Assinaturas (Subscription) — controle de vigência do plano.
 */
export class SubscriptionRepository extends TenantAwareRepository {
  async findCurrent(): Promise<import('@prisma/client').Subscription | null> {
    return prisma.subscription.findFirst({
      where: { tenantId: this.tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsert(data: Prisma.SubscriptionUncheckedCreateInput): Promise<import('@prisma/client').Subscription> {
    const existing = await this.findCurrent();
    if (existing) {
      return prisma.subscription.update({ where: { id: existing.id }, data });
    }
    return prisma.subscription.create({
      data: { ...data, tenantId: this.tenantId } as Prisma.SubscriptionUncheckedCreateInput,
    });
  }
}

/**
 * Repositório de Convites (Invitation) — entrada de novos membros.
 */
export class InvitationRepository extends TenantAwareRepository {
  async findPendingByEmail(email: string): Promise<import('@prisma/client').Invitation | null> {
    return prisma.invitation.findFirst({
      where: { tenantId: this.tenantId, email, status: 'PENDING' },
    });
  }

  async findById(id: string): Promise<import('@prisma/client').Invitation | null> {
    return prisma.invitation.findFirst({ where: this.whereOwned(id) });
  }

  async findByToken(token: string): Promise<import('@prisma/client').Invitation | null> {
    return prisma.invitation.findUnique({ where: { id: token } });
  }

  async create(data: Prisma.InvitationUncheckedCreateInput): Promise<import('@prisma/client').Invitation> {
    return prisma.invitation.create({ data });
  }

  async update(id: string, data: Prisma.InvitationUpdateInput): Promise<import('@prisma/client').Invitation> {
    return prisma.invitation.update({ where: this.whereOwned(id), data });
  }

  async accept(id: string, userId: string): Promise<import('@prisma/client').Invitation> {
    return prisma.invitation.update({
      where: this.whereOwned(id),
      data: { status: 'ACCEPTED', acceptedById: userId, acceptedAt: new Date() },
    });
  }
}

export { EntityNotFoundError };
