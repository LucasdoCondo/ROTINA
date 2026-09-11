import type { Request, Response } from 'express';
import { asyncHandler } from '../../middlewares/http.js';
import type { ValidatedRequest } from '../../types/http.js';
import { tenantsService } from './tenants.service.js';
import type { UpdateTenantInput } from './tenants.schema.js';

/** GET /api/v1/tenants/me */
export const getMyTenant = asyncHandler(async (_req: Request, res: Response) => {
  const data = await tenantsService.getMyTenant();
  res.json({ success: true, data });
});

/** PATCH /api/v1/tenants/me */
export const updateMyTenant = asyncHandler(async (req: Request, res: Response) => {
  const body = (req as ValidatedRequest).validated.body as UpdateTenantInput;
  const data = await tenantsService.updateMyTenant(body);
  res.json({ success: true, data });
});