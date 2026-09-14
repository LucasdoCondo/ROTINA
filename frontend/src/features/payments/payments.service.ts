import { api } from '@/services/api/http-client';
import type { ApiEnvelope } from '@/types/api';

/** Plano do tenant (espelhado no backend). */
export type TenantPlan = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';

export interface Subscription {
  id: string;
  tenantId: string;
  status: SubscriptionStatus;
  plan: TenantPlan;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  externalId: string | null;
  provider: 'STRIPE' | 'MERCADOPAGO' | 'PAGARME' | 'MANUAL';
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionDetail {
  subscription: Subscription;
  tenantPlan: TenantPlan;
}

export interface CheckoutInput {
  plan: Exclude<TenantPlan, 'FREE'>;
  providerCustomerId?: string;
}

export const PLANS: ReadonlyArray<{
  id: Exclude<TenantPlan, 'FREE'>;
  name: string;
  price: number;
  features: string[];
}> = [
  {
    id: 'STARTER',
    name: 'Starter',
    price: 49,
    features: ['Até 5 membros', 'Chamados ilimitados', 'CRM básico', 'E-commerce 50 produtos'],
  },
  {
    id: 'PROFESSIONAL',
    name: 'Professional',
    price: 99,
    features: ['Até 20 membros', 'Chamados + automações', 'CRM completo', 'E-commerce ilimitado'],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: 299,
    features: ['Membros ilimitados', 'SLA garantido', 'SSO / RBAC avançado', 'Suporte prioritário'],
  },
];

export const paymentsService = {
  async getSubscription(): Promise<SubscriptionDetail> {
    const { data } = await api.get<ApiEnvelope<SubscriptionDetail>>('/payments/subscription');
    return data.data;
  },
  async checkout(input: CheckoutInput): Promise<{ checkoutUrl: string | null }> {
    const { data } = await api.post<ApiEnvelope<{ checkoutUrl: string | null }>>(
      '/payments/checkout',
      input,
    );
    return data.data;
  },
  async cancel(cancelAtPeriodEnd = true): Promise<Subscription> {
    const { data } = await api.patch<ApiEnvelope<Subscription>>(
      '/payments/subscription/cancel',
      { cancelAtPeriodEnd },
    );
    return data.data;
  },
};