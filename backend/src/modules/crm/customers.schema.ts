import { z } from 'zod';
import { CUSTOMER_STATUSES } from '../../domain/constants.js';

/** Documento: CPF (11 dígitos) ou CNPJ (14 dígitos), sem máscara. */
const documentSchema = z
  .string()
  .trim()
  .regex(/^\d{11}$|^\d{14}$/, 'Use CPF (11 dígitos) ou CNPJ (14 dígitos), sem máscara');

export const createCustomerSchema = z
  .object({
    name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(255),
    email: z.string().trim().toLowerCase().email().max(255).optional().nullable(),
    phone: z.string().trim().min(5).max(40).optional().nullable(),
    company: z.string().trim().max(255).optional().nullable(),
    document: documentSchema.optional().nullable(),
    status: z.enum(CUSTOMER_STATUSES).optional(),
    notes: z.string().trim().max(5_000).optional().nullable(),
    // Owner deve ser ADMIN/AGENT ativo do tenant (validado no serviço).
    ownerId: z.string().uuid().optional().nullable(),
  })
  .strict();

export const updateCustomerSchema = z
  .object({
    name: z.string().trim().min(2).max(255).optional(),
    email: z.string().trim().toLowerCase().email().max(255).optional().nullable(),
    phone: z.string().trim().min(5).max(40).optional().nullable(),
    company: z.string().trim().max(255).optional().nullable(),
    document: documentSchema.optional().nullable(),
    status: z.enum(CUSTOMER_STATUSES).optional(),
    notes: z.string().trim().max(5_000).optional().nullable(),
    ownerId: z.string().uuid().optional().nullable(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'At least one field is required');

export const listCustomersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(CUSTOMER_STATUSES).optional(),
    owner: z.union([z.literal('me'), z.string().uuid()]).optional(),
    q: z.string().trim().max(100).optional(),
    sort: z.enum(['newest', 'oldest', 'name']).default('newest'),
  })
  .strict();

export const customerParamSchema = z
  .object({
    id: z.string().uuid('Customer id must be a valid UUID'),
  })
  .strict();

export type CreateCustomerInput = z.output<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.output<typeof updateCustomerSchema>;
export type ListCustomersQuery = z.output<typeof listCustomersQuerySchema>;
export type CustomerParam = z.output<typeof customerParamSchema>;