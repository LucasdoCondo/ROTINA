import { z } from 'zod';
import { DEAL_STAGES } from '../../domain/constants.js';

/** Valor monetário: 0 até 9.999.999.999,99 (2 casas, Decimal(14,2) no BD). */
const moneySchema = z.number().nonnegative().max(9_999_999_999.99);

export const createDealSchema = z
  .object({
    customerId: z.string().uuid('customerId must be a valid UUID'),
    title: z.string().trim().min(2, 'Mínimo 2 caracteres').max(200),
    value: moneySchema,
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Código ISO 4217 (3 letras)').default('BRL'),
    stage: z.enum(DEAL_STAGES).optional(),
    probability: z.number().int().min(0).max(100).optional(),
    expectedCloseAt: z.coerce.date().optional(),
    // Owner deve ser ADMIN/AGENT ativo do tenant (validado no serviço).
    ownerId: z.string().uuid().optional(),
  })
  .strict();

export const updateDealSchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    value: moneySchema.optional(),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).optional(),
    stage: z.enum(DEAL_STAGES).optional(),
    probability: z.number().int().min(0).max(100).optional(),
    expectedCloseAt: z.coerce.date().optional(),
    ownerId: z.string().uuid().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'At least one field is required');

/** Movimentação no pipeline (máquina de estados no serviço). */
export const moveDealStageSchema = z
  .object({
    stage: z.enum(DEAL_STAGES),
  })
  .strict();

export const listDealsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    stage: z.enum(DEAL_STAGES).optional(),
    customer: z.union([z.literal('me'), z.string().uuid()]).optional(),
    owner: z.union([z.literal('me'), z.string().uuid()]).optional(),
    q: z.string().trim().max(100).optional(),
    sort: z.enum(['newest', 'oldest', 'value', 'expected']).default('newest'),
  })
  .strict();

export const dealParamSchema = z
  .object({
    id: z.string().uuid('Deal id must be a valid UUID'),
  })
  .strict();

export type CreateDealInput = z.output<typeof createDealSchema>;
export type UpdateDealInput = z.output<typeof updateDealSchema>;
export type MoveDealStageInput = z.output<typeof moveDealStageSchema>;
export type ListDealsQuery = z.output<typeof listDealsQuerySchema>;
export type DealParam = z.output<typeof dealParamSchema>;