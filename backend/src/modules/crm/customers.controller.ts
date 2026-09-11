import type { Request, Response } from 'express';
import { asyncHandler } from '../../middlewares/http.js';
import type { AuthenticatedRequest, ValidatedRequest } from '../../types/http.js';
import { customerService } from './customers.service.js';
import type {
  CreateCustomerInput,
  CustomerParam,
  ListCustomersQuery,
  UpdateCustomerInput,
} from './customers.schema.js';

/** GET /api/v1/crm/customers */
export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const query = (req as ValidatedRequest).validated.query as ListCustomersQuery;

  const { rows, meta } = await customerService.list(auth, query);
  res.json({ success: true, data: rows, meta });
});

/** POST /api/v1/crm/customers */
export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const body = (req as ValidatedRequest).validated.body as CreateCustomerInput;

  const data = await customerService.create(auth, body);
  res.status(201).json({ success: true, data });
});

/** GET /api/v1/crm/customers/:id */
export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const { id } = (req as ValidatedRequest).validated.params as CustomerParam;

  const data = await customerService.getById(auth, id);
  res.json({ success: true, data });
});

/** PATCH /api/v1/crm/customers/:id */
export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const { id } = (req as ValidatedRequest).validated.params as CustomerParam;
  const body = (req as ValidatedRequest).validated.body as UpdateCustomerInput;

  const data = await customerService.update(auth, id, body);
  res.json({ success: true, data });
});

/** DELETE /api/v1/crm/customers/:id (ADMIN, soft delete) */
export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const { id } = (req as ValidatedRequest).validated.params as CustomerParam;

  await customerService.remove(auth, id);
  res.status(204).send();
});