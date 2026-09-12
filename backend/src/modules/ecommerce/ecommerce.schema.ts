import { z } from 'zod';

/**
 * Schemas de validação do módulo E-commerce.
 * Validação de entrada com Zod (OWASP: validar tudo que vem do cliente).
 */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ---------- Product ----------

export const createProductSchema = z
  .object({
    name: z.string().trim().min(2).max(255),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(255)
      .regex(SLUG_RE, 'Slug: minúsculas, números e hífens'),
    description: z.string().max(5000).optional(),
    sku: z.string().trim().min(1).max(100).optional(),
    price: z.coerce.number().positive('Preço deve ser positivo').max(999_999_999.99),
    costPrice: z.coerce.number().positive().optional(),
    stock: z.coerce.number().int().min(0).default(0),
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED', 'OUT_OF_STOCK']).default('DRAFT'),
    imageUrl: z.string().url().max(500).optional(),
  })
  .strict();

export const updateProductSchema = createProductSchema.partial();

export const listProductsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(10),
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED', 'OUT_OF_STOCK']).optional(),
    q: z.string().trim().max(255).optional(),
    sort: z.enum(['newest', 'oldest', 'price_asc', 'price_desc', 'name']).default('newest'),
  })
  .strict();

// ---------- Order ----------

export const createOrderItemSchema = z
  .object({
    productId: z.string().uuid(),
    quantity: z.coerce.number().int().positive().max(9999),
  })
  .strict();

export const createOrderSchema = z
  .object({
    customerId: z.string().uuid(),
    items: z.array(createOrderItemSchema).min(1, 'Pedido deve ter ao menos 1 item'),
    notes: z.string().max(2000).optional(),
    taxAmount: z.coerce.number().min(0).default(0),
    discountAmount: z.coerce.number().min(0).default(0),
  })
  .strict();

export const updateOrderStatusSchema = z
  .object({
    status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELED', 'REFUNDED']),
  })
  .strict();

export const listOrdersQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(10),
    status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELED', 'REFUNDED']).optional(),
    customerId: z.string().uuid().optional(),
    q: z.string().trim().max(255).optional(),
    sort: z.enum(['newest', 'oldest', 'total']).default('newest'),
  })
  .strict();

// ---------- Types ----------

export type CreateProductInput = z.output<typeof createProductSchema>;
export type UpdateProductInput = z.output<typeof updateProductSchema>;
export type ListProductsQuery = z.output<typeof listProductsQuerySchema>;
export type CreateOrderInput = z.output<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.output<typeof updateOrderStatusSchema>;
export type ListOrdersQuery = z.output<typeof listOrdersQuerySchema>;
