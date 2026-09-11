import { api } from '@/services/api/http-client';
import type { ApiEnvelope, PageMeta } from '@/types/api';

/**
 * Contratos do módulo CRM — espelha backend/src/modules/crm.
 * RBAC do backend: todo o módulo é ADMIN/AGENT (MEMBER recebe 403);
 * soft delete de clientes/deals apenas ADMIN.
 */

export const CUSTOMER_STATUSES = ['LEAD', 'PROSPECT', 'ACTIVE', 'INACTIVE', 'CHURNED'] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const DEAL_STAGES = ['LEAD', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

export interface OwnerRef {
  id: string;
  name: string;
  email: string;
}

export interface CustomerRef {
  id: string;
  name: string;
  company: string | null;
  status: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  /** CPF/CNPJ sem máscara (validado no backend). */
  document: string | null;
  status: CustomerStatus;
  notes: string | null;
  ownerId: string | null;
  owner: OwnerRef | null;
  _count: { deals: number; tickets: number };
  createdAt: string;
  updatedAt: string;
}

export interface CustomerListParams {
  page?: number;
  pageSize?: number;
  status?: CustomerStatus;
  q?: string;
}

export interface CustomerListResult {
  rows: Customer[];
  meta: PageMeta;
}

export interface CreateCustomerInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  document?: string | null;
  notes?: string | null;
}

export interface UpdateCustomerInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  document?: string | null;
  status?: CustomerStatus;
  notes?: string | null;
}

export interface Deal {
  id: string;
  customerId: string;
  title: string;
  /** Decimal(14,2) no backend — chega como string no JSON. */
  value: string;
  currency: string;
  stage: DealStage;
  probability: number | null;
  expectedCloseAt: string | null;
  closedAt: string | null;
  ownerId: string;
  owner: OwnerRef;
  customer: CustomerRef;
  createdAt: string;
  updatedAt: string;
}

export interface DealListParams {
  page?: number;
  pageSize?: number;
  stage?: DealStage;
}

export interface DealListResult {
  rows: Deal[];
  meta: PageMeta;
}

export interface FunnelStage {
  stage: DealStage;
  count: number;
  total: number;
}

export interface FunnelResponse {
  stages: FunnelStage[];
  summary: {
    openCount: number;
    openValue: number;
    wonCount: number;
    wonValue: number;
    lostCount: number;
    winRate: number;
  };
}

export interface CreateDealInput {
  customerId: string;
  title: string;
  value: number;
  currency?: string;
  stage?: DealStage;
  probability?: number;
}

// ───────────────────────── Customers ─────────────────────────

export async function listCustomers(params: CustomerListParams): Promise<CustomerListResult> {
  const { data } = await api.get<ApiEnvelope<CustomerListResult>>('/crm/customers', { params });
  return data.data;
}

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const { data } = await api.post<ApiEnvelope<Customer>>('/crm/customers', input);
  return data.data;
}

export async function updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer> {
  const { data } = await api.patch<ApiEnvelope<Customer>>(`/crm/customers/${id}`, input);
  return data.data;
}

export async function deleteCustomer(id: string): Promise<void> {
  await api.delete(`/crm/customers/${id}`);
}

// ───────────────────────── Deals (funil) ─────────────────────────

export async function listDeals(params: DealListParams): Promise<DealListResult> {
  const { data } = await api.get<ApiEnvelope<DealListResult>>('/crm/deals', { params });
  return data.data;
}

export async function getDealFunnel(): Promise<FunnelResponse> {
  const { data } = await api.get<ApiEnvelope<FunnelResponse>>('/crm/deals/funnel');
  return data.data;
}

export async function createDeal(input: CreateDealInput): Promise<Deal> {
  const { data } = await api.post<ApiEnvelope<Deal>>('/crm/deals', input);
  return data.data;
}

/** Movimentação no pipeline — máquina de estados validada no backend. */
export async function moveDealStage(id: string, stage: DealStage): Promise<Deal> {
  const { data } = await api.patch<ApiEnvelope<Deal>>(`/crm/deals/${id}/stage`, { stage });
  return data.data;
}

export async function deleteDeal(id: string): Promise<void> {
  await api.delete(`/crm/deals/${id}`);
}
