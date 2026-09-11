import type { Request, Response } from 'express';
import { asyncHandler } from '../../middlewares/http.js';
import type { AuthenticatedRequest, ValidatedRequest } from '../../types/http.js';
import { dealService, moveDealStage, removeDeal, updateDeal } from './deals.service.js';
import type {
  CreateDealInput,
  DealParam,
  ListDealsQuery,
  MoveDealStageInput,
  UpdateDealInput,
} from './deals.schema.js';

/** GET /api/v1/crm/deals */
export const listDeals = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const query = (req as ValidatedRequest).validated.query as ListDealsQuery;

  const { rows, meta } = await dealService.list(auth, query);
  res.json({ success: true, data: rows, meta });
});

/** GET /api/v1/crm/deals/funnel — deve vir ANTES de GET /:id */
export const getDealFunnel = asyncHandler(async (_req: Request, res: Response) => {
  const data = await dealService.funnel();
  res.json({ success: true, data });
});

/** POST /api/v1/crm/deals */
export const createDeal = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const body = (req as ValidatedRequest).validated.body as CreateDealInput;

  const data = await dealService.create(auth, body);
  res.status(201).json({ success: true, data });
});

/** GET /api/v1/crm/deals/:id */
export const getDeal = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const { id } = (req as ValidatedRequest).validated.params as DealParam;

  const data = await dealService.getById(auth, id);
  res.json({ success: true, data });
});

/** PATCH /api/v1/crm/deals/:id */
export const updateDealHandler = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const { id } = (req as ValidatedRequest).validated.params as DealParam;
  const body = (req as ValidatedRequest).validated.body as UpdateDealInput;

  const data = await updateDeal(auth, id, body);
  res.json({ success: true, data });
});

/** PATCH /api/v1/crm/deals/:id/stage — mover no pipeline (kanban) */
export const moveDealStageHandler = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const { id } = (req as ValidatedRequest).validated.params as DealParam;
  const body = (req as ValidatedRequest).validated.body as MoveDealStageInput;

  const data = await moveDealStage(auth, id, body);
  res.json({ success: true, data });
});

/** DELETE /api/v1/crm/deals/:id (ADMIN, soft delete) */
export const deleteDeal = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const { id } = (req as ValidatedRequest).validated.params as DealParam;

  await removeDeal(auth, id);
  res.status(204).send();
});