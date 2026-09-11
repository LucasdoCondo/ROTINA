import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';
import { requireTenantContext } from '../../shared/tenant-context.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors.js';
import { TICKET_STATUS_TRANSITIONS } from '../../domain/constants.js';
import type { AuthUser } from '../../types/http.js';
import { TicketRepository, TICKET_INCLUDE } from './tickets.repository.js';
import type {
  CreateTicketMessageInput,
  AssignTicketInput,
  CreateTicketInput,
  ListTicketsQuery,
  UpdateTicketInput,
} from './tickets.schema.js';

const repository = new TicketRepository();

/**
 * Número secuencial por tenant.
 * Se emite "último+1" dentro de uma transacción. Ante colisión por
 * concurrencia (unique [tenantId, number]) se reintenta hasta 5 veces.
 */
const MAX_NUMBER_RETRIES = 5;

async function withUniqueNumberRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= MAX_NUMBER_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isNumberCollision =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
      if (!isNumberCollision) throw err;
    }
  }
  throw new ConflictError('Could not allocate a unique ticket number; retry', 'TICKET_NUMBER_EXHAUSTED');
}

/**
 * Protocolo legível e único por tenant: `TKT-<ano>-<número 6 dígitos>`.
 * Ex.: TKT-2026-000042. Deriva do número sequencial, que já é único
 * por tenant (unique [tenantId, number]), logo o protocolo também é.
 */
function buildProtocol(year: number, number: number): string {
  return `TKT-${year}-${String(number).padStart(6, '0')}`;
}

export const ticketService = {
  /**
   * Creación de ticket. RBAC: cualquier usuario ACTIVO del tenant.
   * Gera protocolo automaticamente e valida o customer vinculado (se houver).
   * La extensión inyecta tenant_id en el create dentro de la transacción.
   */
  async create(auth: AuthUser, input: CreateTicketInput) {
    const { tenantId } = requireTenantContext();

    if (input.customerId) {
      const customer = await repository.findCustomer(input.customerId);
      if (!customer) {
        throw new BadRequestError('Customer not found in this tenant', 'CUSTOMER_NOT_FOUND');
      }
    }

    return withUniqueNumberRetry(() =>
      prisma.$transaction(async (tx) => {
        const last = await tx.ticket.findFirst({
          where: { tenantId, deletedAt: null },
          orderBy: { number: 'desc' },
          select: { number: true },
        });
        const number = (last?.number ?? 0) + 1;
        const protocol = buildProtocol(new Date().getFullYear(), number);

        return tx.ticket.create({
          data: {
            subject: input.subject,
            description: input.description,
            priority: input.priority ?? 'MEDIUM',
            category: input.category ?? 'OTHER',
            number,
            protocol,
            customerId: input.customerId,
            // tenant_id se inyecta explícitamente aquí (y la extensión lo
            // refuerza): el tipo de Prisma lo exige en create.
            tenantId,
            creatorId: auth.userId,
            updatedById: auth.userId,
          } as never,
          include: TICKET_INCLUDE,
        });
      }),
    );
  },

  /** Listado paginado y filtrado, siempre scoped por tenant. */
  async list(auth: AuthUser, query: ListTicketsQuery) {
    const creatorId =
      query.creator === 'me' ? auth.userId : query.creator ?? undefined;
    const assigneeId =
      query.assignee === 'me'
        ? auth.userId
        : (query.assignee ?? undefined);

    const { rows, total } = await repository.list({
      status: query.status,
      priority: query.priority,
      category: query.category,
      customerId: query.customerId,
      creatorId,
      assigneeId,
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

  /** Detalle de ticket (404 si no existe o no pertenece al tenant). */
  async getById(_auth: AuthUser, id: string) {
    const ticket = await repository.findById(id);
    if (!ticket) throw new NotFoundTicketError(id);
    return ticket;
  },

  /**
   * Actualización con RBAC y máquina de estados:
   *  - ADMIN/AGENT: campos + status.
   *  - MEMBER: solo dueño del ticket, sin modificar status/assignee.
   */
  async update(auth: AuthUser, id: string, input: UpdateTicketInput) {
    const existing = await repository.findById(id);
    if (!existing) throw new NotFoundTicketError(id);

    const isStaff = auth.role === 'ADMIN' || auth.role === 'AGENT';
    if (!isStaff && existing.creatorId !== auth.userId) {
      throw new ForbiddenError('Only the ticket creator or staff can update it');
    }
    if (!isStaff && input.status !== undefined) {
      throw new ForbiddenError('Members cannot change ticket status');
    }

    // Customer vinculado: valida existência no tenant (ou desvincula com null).
    if (input.customerId !== undefined && input.customerId !== null) {
      const customer = await repository.findCustomer(input.customerId);
      if (!customer) {
        throw new BadRequestError('Customer not found in this tenant', 'CUSTOMER_NOT_FOUND');
      }
    }

    const patch: Record<string, unknown> = { ...input };
    if ('status' in patch && patch.status !== existing.status) {
      const allowed = TICKET_STATUS_TRANSITIONS[existing.status];
      if (!allowed.includes(input.status as never)) {
        throw new BadRequestError(
          `Invalid ticket transition: ${existing.status} → ${String(input.status)}`,
        );
      }
    }

    return repository.update(id, { ...patch, updatedById: auth.userId } as never);
  },

  /** Asignación a un AGENT/ADMIN del MISMO tenant. */
  async assign(auth: AuthUser, id: string, input: AssignTicketInput) {
    const existing = await repository.findById(id);
    if (!existing) throw new NotFoundTicketError(id);

    const agent = await repository.findAvailableAssignee(input.assigneeId);
    if (!agent) {
      throw new BadRequestError('Assignee must be an active ADMIN or AGENT of this tenant');
    }

    return repository.update(id, { assigneeId: input.assigneeId, updatedById: auth.userId });
  },

  /** Soft delete (solo ADMIN — RBAC en la ruta). */
  async remove(auth: AuthUser, id: string): Promise<void> {
    await repository.softDelete(id, auth.userId);
  },

  // ---------- Interações / histórico ----------

  /**
   * Histórico do chamado (cronológico). MEMBER vê apenas o próprio ticket
   * e NUNCA vê notas internas; ADMIN/AGENT veem tudo.
   */
  async listMessages(auth: AuthUser, ticketId: string, limit: number) {
    const ticket = await repository.findById(ticketId);
    if (!ticket) throw new NotFoundTicketError(ticketId);

    const isStaff = auth.role === 'ADMIN' || auth.role === 'AGENT';
    if (!isStaff && ticket.creatorId !== auth.userId) {
      throw new ForbiddenError('Only the ticket creator or staff can view its messages');
    }

    return repository.listMessages(ticketId, isStaff, limit);
  },

  /**
   * Nova interação no chamado (append-only; mensagens nunca são editadas).
   * - ADMIN/AGENT: nota interna (isInternal) ou resposta pública; autor STAFF.
   * - MEMBER: apenas resposta pública no próprio ticket; autor CUSTOMER.
   */
  async addMessage(auth: AuthUser, ticketId: string, input: CreateTicketMessageInput) {
    const ticket = await repository.findById(ticketId);
    if (!ticket) throw new NotFoundTicketError(ticketId);

    const isStaff = auth.role === 'ADMIN' || auth.role === 'AGENT';

    if (!isStaff) {
      if (ticket.creatorId !== auth.userId) {
        throw new ForbiddenError('Only the ticket creator or staff can add messages');
      }
      if (input.isInternal) {
        throw new ForbiddenError('Members cannot create internal notes');
      }
    }

    // Interação do staff em ticket aberto move para IN_PROGRESS? Não aqui:
    // a máquina de estados permanece explícita (PATCH /tickets/:id).

    const [message] = await Promise.all([
      repository.createMessage({
        ticketId,
        authorId: auth.userId,
        authorType: isStaff ? 'STAFF' : 'CUSTOMER',
        isInternal: isStaff && input.isInternal === true,
        body: input.body,
      }),
      // Tocar o ticket para refletir atividade recente (updated_at).
      repository.update(ticketId, { updatedById: auth.userId }),
    ]);

    return message;
  },
};

/** 404 tipado para tickets del tenant (no expone ids en logs). */
class NotFoundTicketError extends NotFoundError {
  constructor(id: string) {
    super(`Ticket ${String(id)} not found or not accessible in this tenant`);
    this.name = 'NotFoundTicketError';
  }
}