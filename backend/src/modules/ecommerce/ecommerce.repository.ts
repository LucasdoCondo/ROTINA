import { randomBytes } from 'node:crypto';
import { prisma } from '../../config/prisma.js';
import { requireTenantContext } from '../../shared/tenant-context.js';
import { NotFoundError } from '../../shared/errors.js';
import type {
  CreateOrderInput,
  CreateProductInput,
  ListOrdersQuery,
  ListProductsQuery,
  UpdateProductInput,
} from './ecommerce.schema.js';

export const productRepository = {
  async list(query: ListProductsQuery) {
    const { tenantId } = requireTenantContext();
    const where = {
      tenantId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { OR: [{ name: { contains: query.q, mode: 'insensitive' as const } }] } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: query.sort === 'price_asc' ? { price: 'asc' } : query.sort === 'price_desc' ? { price: 'desc' } : { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.product.count({ where }),
    ]);
    return { rows, meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) } };
  },

  async findById(id: string) {
    const { tenantId } = requireTenantContext();
    return prisma.product.findFirst({ where: { id, tenantId, deletedAt: null } });
  },

  async create(input: CreateProductInput & { createdBy?: string }) {
    const { tenantId } = requireTenantContext();
    return prisma.product.create({ data: { tenantId, ...input } });
  },

  async update(id: string, input: UpdateProductInput) {
    const { tenantId } = requireTenantContext();
    return prisma.product.updateMany({ where: { id, tenantId, deletedAt: null }, data: input });
  },

  async softDelete(id: string) {
    const { tenantId } = requireTenantContext();
    return prisma.product.updateMany({ where: { id, tenantId, deletedAt: null }, data: { deletedAt: new Date() } });
  },
};

export const orderRepository = {
  async list(query: ListOrdersQuery) {
    const { tenantId } = requireTenantContext();
    const where = {
      tenantId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { customer: { select: { id: true, name: true } }, items: { include: { product: { select: { id: true, name: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.order.count({ where }),
    ]);
    return { rows, meta: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.max(1, Math.ceil(total / query.pageSize)) } };
  },

  async findById(id: string) {
    const { tenantId } = requireTenantContext();
    return prisma.order.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { customer: { select: { id: true, name: true } }, items: { include: { product: { select: { id: true, name: true } } } } },
    });
  },

    async createWithItems(input: CreateOrderInput & { createdBy?: string; subtotal: number; total: number }, items: Array<{ productId: string; quantity: number; unitPrice: string; totalPrice: string }>) {
    const { tenantId } = requireTenantContext();
    const number = `ORD-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    return prisma.order.create({
      data: {
        tenantId,
        number,
        customerId: input.customerId,
        notes: input.notes,
        taxAmount: input.taxAmount ?? 0,
        discountAmount: input.discountAmount ?? 0,
        subtotal: input.subtotal,
        total: input.total,
        createdBy: input.createdBy,
        items: {
          createMany: {
            data: items.map((i) => ({
              tenantId,
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.totalPrice,
            })),
          },
        },
      },
      include: { customer: { select: { id: true, name: true } }, items: { include: { product: { select: { id: true, name: true } } } } },
    });
  },

    async updateStatus(id: string, status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELED' | 'REFUNDED') {
    const { tenantId } = requireTenantContext();
    return prisma.order.updateMany({ where: { id, tenantId, deletedAt: null }, data: { status } });
  },
};
