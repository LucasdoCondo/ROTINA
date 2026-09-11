/**
 * Valores canónicos de dominio (RBAC + estados) compartidos entre
 * validación Zod, servicios y respuestas. Los enums de Prisma emiten los
 * mismos literales, por lo que ambos son intercambiables en tipado.
 */
export const USER_ROLES = ['ADMIN', 'AGENT', 'MEMBER'] as const;
export type UserRoleValue = (typeof USER_ROLES)[number];
export const USER_ROLE_VALUES = ['ADMIN', 'AGENT', 'MEMBER'] as const;

export const USER_STATUSES = ['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;
export type UserStatusValue = (typeof USER_STATUSES)[number];
export const USER_STATUS_VALUES = ['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;

export const TENANT_STATUSES = ['TRIAL', 'ACTIVE', 'SUSPENDED'] as const;
export type TenantStatusValue = (typeof TENANT_STATUSES)[number];

export const TENANT_PLANS = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'] as const;
export type TenantPlanValue = (typeof TENANT_PLANS)[number];

export const TICKET_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_ON_CUSTOMER',
  'RESOLVED',
  'CLOSED',
] as const;
export type TicketStatusValue = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type TicketPriorityValue = (typeof TICKET_PRIORITIES)[number];

export const TICKET_CATEGORIES = [
  'BUG',
  'FEATURE',
  'ACCOUNT',
  'ACCESS',
  'PAYMENT',
  'BILLING',
  'QUESTION',
  'OTHER',
] as const;
export type TicketCategoryValue = (typeof TICKET_CATEGORIES)[number];

export const CUSTOMER_STATUSES = ['LEAD', 'PROSPECT', 'ACTIVE', 'INACTIVE', 'CHURNED'] as const;
export type CustomerStatusValue = (typeof CUSTOMER_STATUSES)[number];

export const DEAL_STAGES = [
  'LEAD',
  'QUALIFICATION',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST',
] as const;
export type DealStageValue = (typeof DEAL_STAGES)[number];

/**
 * Máquina de estágios do deal (pipeline): avança/retrocede um passo e
 * fecha via WON/LOST. WON e LOST são terminais (reabertura = novo deal).
 */
export const DEAL_STAGE_TRANSITIONS: Record<DealStageValue, readonly DealStageValue[]> = {
  LEAD: ['QUALIFICATION', 'LOST'],
  QUALIFICATION: ['LEAD', 'PROPOSAL', 'LOST'],
  PROPOSAL: ['QUALIFICATION', 'NEGOTIATION', 'LOST'],
  NEGOTIATION: ['PROPOSAL', 'WON', 'LOST'],
  WON: [],
  LOST: [],
};

/** Estágios que encerram a negociação (preenchem `closed_at`). */
export const DEAL_CLOSED_STAGES = ['WON', 'LOST'] as const;

export const TICKET_MESSAGE_AUTHOR_TYPES = ['CUSTOMER', 'STAFF', 'SYSTEM'] as const;
export type TicketMessageAuthorTypeValue = (typeof TICKET_MESSAGE_AUTHOR_TYPES)[number];

/**
 * Máquina de estados del ticket: define las transiciones permitidas.
 * Un MEMBER no puede transicionar estado (solo ADMIN/AGENT); el servicio
 * además restringe transiciones inválidas a nivel de aplicación.
 */
export const TICKET_STATUS_TRANSITIONS: Record<
  TicketStatusValue,
  readonly TicketStatusValue[]
> = {
  OPEN: ['IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['OPEN', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED'],
  WAITING_ON_CUSTOMER: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['OPEN', 'IN_PROGRESS', 'CLOSED'],
  CLOSED: ['OPEN'],
};