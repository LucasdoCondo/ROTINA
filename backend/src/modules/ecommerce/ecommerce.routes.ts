import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middlewares/http.js';
import { requireRole } from '../../middlewares/auth.js';
import {
  createOrder,
  createProduct,
  deleteProduct,
  getOrder,
  getProduct,
  listOrders,
  listProducts,
  updateOrderStatus,
  updateProduct,
} from './ecommerce.controller.js';
import {
  createOrderSchema,
  createProductSchema,
  listOrdersQuerySchema,
  listProductsQuerySchema,
  updateOrderStatusSchema,
  updateProductSchema,
} from './ecommerce.schema.js';

export const ecommerceRoutes = Router();

// Products
ecommerceRoutes.get('/products', validate(listProductsQuerySchema, 'query'), listProducts);
ecommerceRoutes.get('/products/:id', validate(z.object({ id: z.string().uuid() }), 'params'), getProduct);
ecommerceRoutes.post('/products', requireRole('ADMIN', 'AGENT'), validate(createProductSchema, 'body'), createProduct);
ecommerceRoutes.patch('/products/:id', requireRole('ADMIN', 'AGENT'), validate(z.object({ id: z.string().uuid() }), 'params'), validate(updateProductSchema, 'body'), updateProduct);
ecommerceRoutes.delete('/products/:id', requireRole('ADMIN'), validate(z.object({ id: z.string().uuid() }), 'params'), deleteProduct);

// Orders
ecommerceRoutes.get('/orders', validate(listOrdersQuerySchema, 'query'), listOrders);
ecommerceRoutes.get('/orders/:id', validate(z.object({ id: z.string().uuid() }), 'params'), getOrder);
ecommerceRoutes.post('/orders', requireRole('ADMIN', 'AGENT', 'MEMBER'), validate(createOrderSchema, 'body'), createOrder);
ecommerceRoutes.patch('/orders/:id/status', requireRole('ADMIN', 'AGENT'), validate(z.object({ id: z.string().uuid() }), 'params'), validate(updateOrderStatusSchema, 'body'), updateOrderStatus);
