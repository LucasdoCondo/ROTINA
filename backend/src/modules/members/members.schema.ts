import { z } from 'zod';
import { USER_ROLES, USER_STATUSES, USER_ROLE_VALUES, USER_STATUS_VALUES } from '../../domain/constants.js';

/** Listagem paginada de membros do tenant. */
export const listMembersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    role: z.enum(USER_ROLE_VALUES).optional(),
    status: z.enum(USER_STATUS_VALUES).optional(),
    q: z.string().trim().max(100).optional(),
    sort: z.enum(['newest', 'oldest', 'name']).default('newest'),
  })
  .strict();

/** Atualização parcial de um membro (role/status). */
export const updateMemberSchema = z
  .object({
    role: z.enum(USER_ROLE_VALUES).optional(),
    status: z.enum(USER_STATUS_VALUES).optional(),
    name: z.string().trim().min(2).max(255).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'At least one field is required');

/** Convite de novo membro. */
export const createInvitationSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(255),
    role: z.enum(USER_ROLE_VALUES).default('MEMBER'),
  })
  .strict();

/** Params com id do membro. */
export const memberParamSchema = z
  .object({
    id: z.string().uuid('Member id must be a valid UUID'),
  })
  .strict();

/** Aceite de convite (público — sem JWT, validado pelo token do convite). */
export const acceptInvitationSchema = z
  .object({
    token: z.string().min(1, 'Invitation token is required'),
    name: z.string().trim().min(2).max(255),
    password: z.string().min(8, 'Mínimo 8 caracteres').max(128),
  })
  .strict();

/** Renovação/upgrade de assinatura (controle de vigência). */
export const upsertSubscriptionSchema = z
  .object({
    plan: z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
    status: z.enum(['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED']).optional(),
    currentPeriodEnd: z.coerce.date().optional(),
    trialEndsAt: z.coerce.date().nullable().optional(),
    cancelAtPeriodEnd: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'At least one field is required');

export type ListMembersQuery = z.output<typeof listMembersQuerySchema>;
export type UpdateMemberInput = z.output<typeof updateMemberSchema>;
export type CreateInvitationInput = z.output<typeof createInvitationSchema>;
export type MemberParam = z.output<typeof memberParamSchema>;
export type AcceptInvitationInput = z.output<typeof acceptInvitationSchema>;
export type UpsertSubscriptionInput = z.output<typeof upsertSubscriptionSchema>;
