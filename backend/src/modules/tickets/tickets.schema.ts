import { z } from 'zod';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from '../../domain/constants.js';

/** Creación de ticket (cualquier usuario activo del tenant). */
export const createTicketSchema = z
  .object({
    subject: z.string().trim().min(3, 'Mínimo 3 caracteres').max(200),
    description: z.string().trim().min(10, 'Mínimo 10 caracteres').max(10_000),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    category: z.enum(TICKET_CATEGORIES).optional(),
    // Cliente vinculado (opcional); deve existir no tenant (validado no serviço).
    customerId: z.string().uuid('customerId must be a valid UUID').optional(),
  })
  .strict();

/** Actualización parcial; los MEMBER no pueden tocar `status` (RBAC en servicio). */
export const updateTicketSchema = z
  .object({
    subject: z.string().trim().min(3).max(200).optional(),
    description: z.string().trim().min(10).max(10_000).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    category: z.enum(TICKET_CATEGORIES).optional(),
    status: z.enum(TICKET_STATUSES).optional(),
    customerId: z.string().uuid().nullable().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'At least one field is required');

export const assignTicketSchema = z
  .object({
    assigneeId: z.string().uuid('Assignee must be a valid UUID'),
  })
  .strict();

/** Filtros paginados del listado. */
export const listTicketsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    category: z.enum(TICKET_CATEGORIES).optional(),
    customerId: z.string().uuid().optional(),
    creator: z.union([z.literal('me'), z.string().uuid()]).optional(),
    assignee: z.union([z.literal('me'), z.literal('none'), z.string().uuid()]).optional(),
    q: z.string().trim().max(100).optional(),
    sort: z.enum(['newest', 'oldest', 'priority']).default('newest'),
  })
  .strict();

export const ticketParamSchema = z
  .object({
    id: z.string().uuid('Ticket id must be a valid UUID'),
  })
  .strict();

// ---------- Mensagens do chamado (histórico) ----------

/** Nova interação. `isInternal: true` é restrito a ADMIN/AGENT (RBAC no serviço). */
export const createTicketMessageSchema = z
  .object({
    body: z.string().trim().min(1, 'Mensagem vazia').max(10_000),
    // true = nota interna (só staff lê/escreve); false = resposta ao cliente.
    isInternal: z.boolean().optional(),
  })
  .strict();

export const listTicketMessagesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(500).default(200),
  })
  .strict();

export type CreateTicketMessageInput = z.output<typeof createTicketMessageSchema>;
export type ListTicketMessagesQuery = z.output<typeof listTicketMessagesQuerySchema>;

export type CreateTicketInput = z.output<typeof createTicketSchema>;
export type UpdateTicketInput = z.output<typeof updateTicketSchema>;
export type AssignTicketInput = z.output<typeof assignTicketSchema>;
export type ListTicketsQuery = z.output<typeof listTicketsQuerySchema>;
export type TicketParam = z.output<typeof ticketParamSchema>;