import { api } from '@/services/api/http-client';
import type { ApiEnvelope, PageMeta } from '@/types/api';

/**
 * Contratos do módulo E-commerce — espelha backend/src/modules/ecommerce.
 * RBAC do backend: produtos (ADMIN/AGENT), pedidos (qualquer usuário ativo).
 */

export const PRODUCT_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED', 'OUT_OF_STOCK'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELED', 'REFUNDED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  price: string;
  costPrice: string | null;
  stock: number;
  status: ProductStatus;
  imageUrl: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  product?: { id: string; name: string; sku: string | null };
}

export interface Order {
  id: string;
  tenantId: string;
  customerId: string;
  number: string;
  status: OrderStatus;
  paymentStatus: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  total: string;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string; email?: string };
  items?: OrderItem[];
}

export interface ProductListParams {
  page?: number;
  pageSize?: number;
  status?: ProductStatus;
  q?: string;
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'name';
}

export interface OrderListParams {
  page?: number;
  pageSize?: number;
  status?: OrderStatus;
  customerId?: string;
  q?: string;
  sort?: 'newest' | 'oldest' | 'total';
}

export interface CreateProductInput {
  name: string;
  slug: string;
  description?: string;
  sku?: string;
  price: number;
  costPrice?: number;
  stock?: number;
  status?: ProductStatus;
  imageUrl?: string;
}

export interface UpdateProductInput {
  name?: string;
  slug?: string;
  description?: string;
  sku?: string;
  price?: number;
  costPrice?: number;
  stock?: number;
  status?: ProductStatus;
  imageUrl?: string;
}

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
}

export interface CreateOrderInput {
  customerId: string;
  items: CreateOrderItemInput[];
  notes?: string;
  taxAmount?: number;
  discountAmount?: number;
}

// ───────────────────────── Products ─────────────────────────

export async function listProducts(params: ProductListParams): Promise<{ rows: Product[]; meta: PageMeta }> {
  const { data } = await api.get<ApiEnvelope<{ rows: Product[]; meta: PageMeta }>>('/ecommerce/products', { params });
  return data.data;
}

export async function getProduct(id: string): Promise<Product> {
  const { data } = await api.get<ApiEnvelope<Product>>(`/ecommerce/products/${id}`);
  return data.data;
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const { data } = await api.post<ApiEnvelope<Product>>('/ecommerce/products', input);
  return data.data;
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
  const { data } = await api.patch<ApiEnvelope<Product>>(`/ecommerce/products/${id}`, input);
  return data.data;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`/ecommerce/products/${id}`);
}

// ───────────────────────── Orders ─────────────────────────

export async function listOrders(params: OrderListParams): Promise<{ rows: Order[]; meta: PageMeta }> {
  const { data } = await api.get<ApiEnvelope<{ rows: Order[]; meta: PageMeta }>>('/ecommerce/orders', { params });
  return data.data;
}

export async function getOrder(id: string): Promise<Order> {
  const { data } = await api.get<ApiEnvelope<Order>>(`/ecommerce/orders/${id}`);
  return data.data;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const { data } = await api.post<ApiEnvelope<Order>>('/ecommerce/orders', input);
  return data.data;
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  const { data } = await api.patch<ApiEnvelope<Order>>(`/ecommerce/orders/${id}/status`, { status });
  return data.data;
}
