import { z } from 'zod';

export const updateTenantSchema = z
  .object({
    name: z.string().trim().min(2).max(255).optional(),
    contactEmail: z.string().trim().toLowerCase().email().max(255).nullable().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'At least one field is required');

export type UpdateTenantInput = z.output<typeof updateTenantSchema>;