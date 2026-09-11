import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { TenantAwareRepository } from '../../shared/tenant-repository.js';
import { NotFoundError } from '../../shared/errors.js';
import type {
  TicketCategoryValue,
  TicketPriorityValue,
  TicketStatusValue,
} from '../../domain/constants.js';

/** Relaciones que siempre se anexan al ticket (sin campos sensibles). */
export const TICKET_INCLUDE = {
  creator: { select: { id: true, name: true, email: true, role: true } },
  assignee: { select: { id: true, name: true, email: true, role: true } },
  customer: { select: { id: true, name: true, company: true, status: true } },
} satisfies Prisma.TicketInclude;

export type TicketWithRelations = Prisma.TicketGetPayload<{
  include: typeof TICKET_INCLUDE;
}>;

/** Mensagem com autor (sem campos sensíveis). */
export const TICKET_MESSAGE_INCLUDE = {
  author: { select: { id: true, name: true, role: true } },
} satisfies Prisma.TicketMessageInclude;

export type TicketMessageWithAuthor = Prisma.TicketMessageGetPayload<{
  include: typeof TICKET_MESSAGE_INCLUDE;
}>;

export interface TicketListCriteria {
  status?: TicketStatusValue;
  priority?: TicketPriorityValue;
  category?: TicketCategoryValue;
  customerId?: string;
  creatorId?: string;
  assigneeId?: string; // 'none' → null
  q?: string;
  sort: 'newest' | 'oldest' | 'priority';
  page: number;
  pageSize: number;
}

/**
 * Repositorio de tickets: CADA método filtra explícitamente por
 * `{ tenantId, deletedAt: null }` (el where se refuerza además en la
 * extensión de Prisma). Nunca se exponen findUnique/update/delete sin scope.
 */
export class TicketRepository extends TenantAwareRepository {
  async findById(id: string): Promise<TicketWithRelations | null> {
    return prisma.ticket.findFirst({
      where: { ...this.whereActive(id) },
      include: TICKET_INCLUDE,
    });
  }

  async findAvailableAssignee(assigneeId: string) {
    return prisma.user.findFirst({
      where: {
        id: assigneeId,
        tenantId: this.tenantId,
        deletedAt: null,
        role: { in: ['ADMIN', 'AGENT'] },
      },
      select: { id: true, name: true, role: true },
    });
  }

  async list(criteria: TicketListCriteria): Promise<{ rows: TicketWithRelations[]; total: number }> {
    const where: Prisma.TicketWhereInput = {
      tenantId: this.tenantId,
      deletedAt: null,
    };

    if (criteria.status) where.status = criteria.status;
    if (criteria.priority) where.priority = criteria.priority;
    if (criteria.category) where.category = criteria.category;
    if (criteria.customerId) where.customerId = criteria.customerId;
    if (criteria.creatorId) where.creatorId = criteria.creatorId;
    if (criteria.assigneeId) {
      where.assigneeId = criteria.assigneeId === 'none' ? null : criteria.assigneeId;
    }
    if (criteria.q) {
      where.OR = [
        { subject: { contains: criteria.q, mode: 'insensitive' } },
        { description: { contains: criteria.q, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.TicketOrderByWithRelationInput[] =
      criteria.sort === 'newest'
        ? [{ createdAt: 'desc' }]
        : criteria.sort === 'oldest'
          ? [{ createdAt: 'asc' }]
          : [{ priority: 'desc' }, { createdAt: 'desc' }];

    const skip = (criteria.page - 1) * criteria.pageSize;
    const take = criteria.pageSize;

    const [rows, total] = await prisma.$transaction([
      prisma.ticket.findMany({ where, include: TICKET_INCLUDE, orderBy, skip, take }),
      prisma.ticket.count({ where }),
    ]);

    return { rows, total };
  }

  /** Actualiza un ticket propio del tenant; 404 si no existe/ofuscado. */
  async update(id: string, data: Partial<Prisma.TicketUncheckedUpdateInput>): Promise<TicketWithRelations> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundTicketError(id);
    }

    await prisma.ticket.updateMany({
      where: { ...this.whereOwned(id), deletedAt: null },
      data,
    });

    const updated = await this.findById(id);
    if (!updated) throw new NotFoundTicketError(id);
    return updated;
  }

  /** Soft delete (deleted_at = now). Solo ADMIN vía RBAC en la ruta. */
  async softDelete(id: string, actorId: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundTicketError(id);

    await prisma.ticket.updateMany({
      where: { ...this.whereOwned(id), deletedAt: null },
      data: { deletedAt: new Date(), updatedById: actorId },
    });
  }

  /** Valida que o customer existe (não removido) no tenant. */
  async findCustomer(customerId: string) {
    return prisma.customer.findFirst({
      where: { id: customerId, tenantId: this.tenantId, deletedAt: null },
      select: { id: true, name: true },
    });
  }

  // ---------- Mensagens (histórico append-only) ----------

  /**
   * Histórico do ticket, cronológico ascendente.
   * `includeInternal: false` oculta notas internas (para MEMBER).
   */
  async listMessages(
    ticketId: string,
    includeInternal: boolean,
    limit: number,
  ): Promise<TicketMessageWithAuthor[]> {
    const where: Prisma.TicketMessageWhereInput = {
      tenantId: this.tenantId,
      ticketId,
    };
    if (!includeInternal) where.isInternal = false;

    return prisma.ticketMessage.findMany({
      where,
      include: TICKET_MESSAGE_INCLUDE,
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async createMessage(data: {
    ticketId: string;
    authorId: string;
    authorType: 'CUSTOMER' | 'STAFF';
    isInternal: boolean;
    body: string;
  }): Promise<TicketMessageWithAuthor> {
    return prisma.ticketMessage.create({
      data: { ...data, tenantId: this.tenantId },
      include: TICKET_MESSAGE_INCLUDE,
    });
  }
}

/** 404 tipado para tickets del tenant (no expone ids en logs). */
class NotFoundTicketError extends NotFoundError {
  constructor(id: string) {
    super(`Ticket ${String(id)} not found or not accessible in this tenant`);
    this.name = 'NotFoundTicketError';
  }
}