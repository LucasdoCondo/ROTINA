import type { Request, Response } from 'express';
import { asyncHandler } from '../../middlewares/http.js';
import type { AuthenticatedRequest, ValidatedRequest } from '../../types/http.js';
import { ecommerceService } from './ecommerce.service.js';
import type {
  CreateOrderInput,
  CreateProductInput,
  ListOrdersQuery,
  ListProductsQuery,
  UpdateOrderStatusInput,
  UpdateProductInput,
} from './ecommerce.schema.js';

// ───────────────────────── Products ─────────────────────────

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const query = (req as ValidatedRequest).validated.query as ListProductsQuery;
  const { rows, meta } = await ecommerceService.listProducts(auth, query);
  res.json({ success: true, data: rows, meta });
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const { id } = (req as ValidatedRequest).validated.params as { id: string };
  const data = await ecommerceService.getProduct(auth, id);
  res.json({ success: true, data });
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const body = (req as ValidatedRequest).validated.body as CreateProductInput;
  const data = await ecommerceService.createProduct(auth, body);
  res.status(201).json({ success: true, data });
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const { id } = (req as ValidatedRequest).validated.params as { id: string };
  const body = (req as ValidatedRequest).validated.body as UpdateProductInput;
  const data = await ecommerceService.updateProduct(auth, id, body);
  res.json({ success: true, data });
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const { id } = (req as ValidatedRequest).validated.params as { id: string };
  await ecommerceService.deleteProduct(auth, id);
  res.status(204).send();
});

// ───────────────────────── Orders ─────────────────────────

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const query = (req as ValidatedRequest).validated.query as ListOrdersQuery;
  const { rows, meta } = await ecommerceService.listOrders(auth, query);
  res.json({ success: true, data: rows, meta });
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const { id } = (req as ValidatedRequest).validated.params as { id: string };
  const data = await ecommerceService.getOrder(auth, id);
  res.json({ success: true, data });
});

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const body = (req as ValidatedRequest).validated.body as CreateOrderInput;
  const data = await ecommerceService.createOrder(auth, body);
  res.status(201).json({ success: true, data });
});

export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const { id } = (req as ValidatedRequest).validated.params as { id: string };
  const body = (req as ValidatedRequest).validated.body as UpdateOrderStatusInput;
  const data = await ecommerceService.updateOrderStatus(auth, id, body);
  res.json({ success: true, data });
});
