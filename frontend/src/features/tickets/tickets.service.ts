import { api } from '@/services/api/http-client';
import type { ApiEnvelope, PageMeta, UserRole } from '@/types/api';

/**
 * Contratos do módulo de Chamados — espelha backend/src/modules/tickets.
 * RBAC do backend: leitura/criação para qualquer usuário ativo do tenant;
 * atribuição e delete apenas ADMIN/AGENT; MEMBER só nos próprios tickets.
 */

export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_CATEGORIES = ['BUG', 'FEATURE', 'ACCOUNT', 'ACCESS', 'PAYMENT', 'BILLING', 'QUESTION', 'OTHER'] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export interface TicketCustomerRef {
  id: string;
  name: string;
  company: string | null;
  status: string;
}

export interface TicketUserRef {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Ticket {
  id: string;
  number: number;
  /** Protocolo legível: TKT-<ano>-<número 6 dígitos>. */
  protocol: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  customerId: string | null;
  customer: TicketCustomerRef | null;
  creatorId: string;
  creator: TicketUserRef;
  assigneeId: string | null;
  assignee: TicketUserRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketListParams {
  page?: number;
  pageSize?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  /** Busca textual em subject/description. */
  q?: string;
  sort?: 'newest' | 'oldest' | 'priority';
}

export interface TicketListResult {
  rows: Ticket[];
  meta: PageMeta;
}

export interface CreateTicketInput {
  subject: string;
  description: string;
  priority?: TicketPriority;
  category?: TicketCategory;
}

export interface UpdateTicketInput {
  subject?: string;
  description?: string;
  priority?: TicketPriority;
  category?: TicketCategory;
  status?: TicketStatus;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  authorId: string | null;
  authorType: 'CUSTOMER' | 'STAFF' | 'SYSTEM';
  /** true = nota interna (só ADMIN/AGENT leem/escrevem). */
  isInternal: boolean;
  body: string;
  createdAt: string;
  author: { id: string; name: string; role: UserRole } | null;
}

export interface AddTicketMessageInput {
  body: string;
  isInternal?: boolean;
}

// ───────────────────────── Endpoints ─────────────────────────

export async function listTickets(params: TicketListParams): Promise<TicketListResult> {
  const { data } = await api.get<ApiEnvelope<TicketListResult>>('/tickets', { params });
  return data.data;
}

/** Abertura de chamado — protocolo gerado no backend (TKT-<ano>-<nº>). */
export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const { data } = await api.post<ApiEnvelope<Ticket>>('/tickets', input);
  return data.data;
}

export async function getTicket(id: string): Promise<Ticket> {
  const { data } = await api.get<ApiEnvelope<Ticket>>(`/tickets/${id}`);
  return data.data;
}

export async function updateTicket(id: string, input: UpdateTicketInput): Promise<Ticket> {
  const { data } = await api.patch<ApiEnvelope<Ticket>>(`/tickets/${id}`, input);
  return data.data;
}

/** Atribuição a um ADMIN/AGENT do mesmo tenant (RBAC no backend). */
export async function assignTicket(id: string, assigneeId: string): Promise<Ticket> {
  const { data } = await api.patch<ApiEnvelope<Ticket>>(`/tickets/${id}/assign`, { assigneeId });
  return data.data;
}

/** Soft delete — somente ADMIN (403 caso contrário). */
export async function deleteTicket(id: string): Promise<void> {
  await api.delete(`/tickets/${id}`);
}

export async function listTicketMessages(id: string, limit = 200): Promise<TicketMessage[]> {
  const { data } = await api.get<ApiEnvelope<TicketMessage[]>>(`/tickets/${id}/messages`, {
    params: { limit },
  });
  return data.data;
}

export async function addTicketMessage(id: string, input: AddTicketMessageInput): Promise<TicketMessage> {
  const { data } = await api.post<ApiEnvelope<TicketMessage>>(`/tickets/${id}/messages`, input);
  return data.data;
}
