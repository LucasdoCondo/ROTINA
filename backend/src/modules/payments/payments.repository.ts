import { prisma } from '../../config/prisma.js';
import { TenantAwareRepository } from '../../shared/tenant-repository.js';
import type { Prisma, Subscription, PaymentEvent } from '@prisma/client';

/**
 * Repositorio de Suscripciones/Pagos — aislado por tenant_id.
 * El webhook (público) encuentra la suscripción por providerSubscriptionId
 * o por tenantId, nunca por id directo sin scope.
 */
export class SubscriptionPaymentRepository extends TenantAwareRepository {
  async findCurrent(): Promise<Subscription | null> {
    return prisma.subscription.findFirst({
      where: { tenantId: this.tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsert(data: Prisma.SubscriptionUncheckedCreateInput): Promise<Subscription> {
    const existing = await this.findCurrent();
    if (existing) {
      return prisma.subscription.update({ where: { id: existing.id }, data });
    }
    return prisma.subscription.create({
      data: { ...data, tenantId: this.tenantId } as Prisma.SubscriptionUncheckedCreateInput,
    });
  }

  async update(id: string, data: Prisma.SubscriptionUpdateInput): Promise<Subscription> {
    return prisma.subscription.update({ where: this.whereOwned(id), data });
  }

  /** Post-webhook: localiza la suscripción del proveedor sin scope de tenant
   *  (evento firmado → confiable) y la actualiza. */
  async updateByProviderSubscriptionId(
    providerSubscriptionId: string,
    data: Prisma.SubscriptionUpdateInput,
  ): Promise<Subscription | null> {
    const sub = await prisma.subscription.findFirst({
      where: { providerSubscriptionId },
    });
    if (!sub) return null;
    return prisma.subscription.update({ where: { id: sub.id }, data });
  }
}

export class PaymentEventRepository {
  /** Crea el evento (falla si el providerEventId ya existe → idempotencia). */
  async create(data: Prisma.PaymentEventUncheckedCreateInput): Promise<PaymentEvent> {
    return prisma.paymentEvent.create({ data });
  }

  async markProcessed(id: string): Promise<void> {
    await prisma.paymentEvent.update({
      where: { id },
      data: { status: 'processed', processedAt: new Date() },
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await prisma.paymentEvent.update({
      where: { id },
      data: { status: 'failed', error: error.slice(0, 2000) },
    });
  }

  async findById(id: string): Promise<PaymentEvent | null> {
    return prisma.paymentEvent.findUnique({ where: { id } });
  }
}

export { EntityNotFoundError } from '../../shared/tenant-repository.js';