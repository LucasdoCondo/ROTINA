import { prisma } from '../../config/prisma.js';
import { requireTenantContext } from '../../shared/tenant-context.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors.js';
import { queueNotification } from '../../queues/notification.queue.js';
import type { AuthUser } from '../../types/http.js';
import type {
  CreateOrderInput,
  CreateProductInput,
  ListOrdersQuery,
  ListProductsQuery,
  UpdateOrderStatusInput,
  UpdateProductInput,
} from './ecommerce.schema.js';
import { orderRepository, productRepository } from './ecommerce.repository.js';

/**
 * Serviço E-commerce: regras de negócio para Produtos e Pedidos.
 * 
 * Features:
 *  - Decremento de estoque atômico (transação Prisma)
 *  - Validação de estoque disponível
 *  - Cálculo automático de totais do pedido
 *  - Isolamento multi-tenant via repositório
 */

const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELED'],
  CONFIRMED: ['PROCESSING', 'CANCELED'],
  PROCESSING: ['SHIPPED', 'CANCELED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELED: [],
  REFUNDED: [],
};

// Tipos para evitar erros de TypeScript
type OrderStatusKey = keyof typeof ORDER_STATUS_TRANSITIONS;

export const ecommerceService = {
  // ───────────────────────── Products ─────────────────────────

  async listProducts(_auth: AuthUser, query: ListProductsQuery) {
    return productRepository.list(query);
  },

  async getProduct(_auth: AuthUser, id: string) {
    const product = await productRepository.findById(id);
    if (!product) throw new NotFoundError('Product not found');
    return product;
  },

  async createProduct(auth: AuthUser, input: CreateProductInput) {
    const { tenantId } = requireTenantContext();

    // Valida slug único por tenant
    const existing = await prisma.product.findFirst({
      where: { tenantId, slug: input.slug, deletedAt: null },
    });
    if (existing) {
      throw new ConflictError('A product with this slug already exists', 'DUPLICATE_SLUG');
    }

    return productRepository.create({ ...input, createdBy: auth.userId });
  },

  async updateProduct(_auth: AuthUser, id: string, input: UpdateProductInput) {
    const existing = await productRepository.findById(id);
    if (!existing) throw new NotFoundError('Product not found');

    const result = await productRepository.update(id, input);
    if (result.count === 0) throw new NotFoundError('Product not found');

    return productRepository.findById(id);
  },

  async deleteProduct(_auth: AuthUser, id: string) {
    const existing = await productRepository.findById(id);
    if (!existing) throw new NotFoundError('Product not found');

    const result = await productRepository.softDelete(id);
    if (result.count === 0) throw new NotFoundError('Product not found');
  },

  // ───────────────────────── Orders ─────────────────────────

  async listOrders(_auth: AuthUser, query: ListOrdersQuery) {
    return orderRepository.list(query);
  },

  async getOrder(_auth: AuthUser, id: string) {
    const order = await orderRepository.findById(id);
    if (!order) throw new NotFoundError('Order not found');
    return order;
  },

  async createOrder(auth: AuthUser, input: CreateOrderInput) {
    const { tenantId } = requireTenantContext();

    return prisma.$transaction(async (tx) => {
      // Valida cliente pertence ao tenant
      const customer = await tx.customer.findFirst({
        where: { id: input.customerId, tenantId, deletedAt: null },
      });
      if (!customer) {
        throw new BadRequestError('Customer not found in this tenant', 'CUSTOMER_NOT_FOUND');
      }

      // Processa itens: valida estoque e calcula totais
      const orderItems: Array<{ productId: string; quantity: number; unitPrice: string; totalPrice: string }> = [];
      let subtotal = 0;

      for (const item of input.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, tenantId, deletedAt: null },
        });

        if (!product) {
          throw new BadRequestError(`Product ${item.productId} not found`, 'PRODUCT_NOT_FOUND');
        }

        if (product.status !== 'ACTIVE') {
          throw new BadRequestError(`Product "${product.name}" is not active`, 'PRODUCT_NOT_ACTIVE');
        }

        if (product.stock < item.quantity) {
          throw new BadRequestError(
            `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`,
            'INSUFFICIENT_STOCK',
          );
        }

        const unitPrice = Number(product.price);
        const totalPrice = unitPrice * item.quantity;
        subtotal += totalPrice;

        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: unitPrice.toFixed(2),
          totalPrice: totalPrice.toFixed(2),
        });

        // Decrementa estoque atomicamente
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: item.quantity } },
        });
      }

                    const taxAmount = Number(input.taxAmount) || 0;
        const discountAmount = Number(input.discountAmount) || 0;
        const total = subtotal + taxAmount - discountAmount;

        return orderRepository.createWithItems(
          { ...input, createdBy: auth.userId, subtotal, total },
          orderItems,
        );
    }).then(async (order) => {
      // Fila assíncrona: notificação de pedido criado (BullMQ background).
      await queueNotification({
        tenantId,
        channel: 'inapp',
        kind: 'order',
        title: `Pedido ${order.number} criado`,
        body: `Pedido no valor de R$ ${Number(order.total).toFixed(2)} foi registrado.`,
        metadata: { orderId: order.id, number: order.number, total: String(order.total) },
        dedupeKey: `order-${order.id}`,
      });
      return order;
    });
  },

  async updateOrderStatus(_auth: AuthUser, id: string, input: UpdateOrderStatusInput) {
    const existing = await orderRepository.findById(id);
    if (!existing) throw new NotFoundError('Order not found');

        const currentStatus = existing.status as OrderStatusKey;
    const allowedTransitions = ORDER_STATUS_TRANSITIONS[currentStatus];
    if (!allowedTransitions || !allowedTransitions.includes(input.status)) {
      throw new BadRequestError(
        `Invalid status transition: ${existing.status} → ${input.status}`,
        'INVALID_TRANSITION',
      );
    }

    const result = await orderRepository.updateStatus(id, input.status);
    if (result.count === 0) throw new NotFoundError('Order not found');

    return orderRepository.findById(id);
  },
};
