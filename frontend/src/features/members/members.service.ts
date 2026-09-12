import { api } from '@/services/api/http-client';
import type { ApiEnvelope, PageMeta } from '@/types/api';

/**
 * Contratos do módulo de Membros/Assinaturas — espelha backend/src/modules/members.
 * RBAC do backend: listagem e gestão apenas ADMIN; MEMBERS veem apenas o próprio perfil.
 */

export const MEMBER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const PLAN_TYPES = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

export const SUBSCRIPTION_STATUSES = ['ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIAL'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'AGENT' | 'MEMBER';
  status: MemberStatus;
  createdAt: string;
  updatedAt: string;
  subscription: Subscription | null;
}

export interface Subscription {
  id: string;
  memberId: string;
  plan: PlanType;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string | null;
  trialEndsAt: string | null;
  nextBillingAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemberListParams {
  page?: number;
  pageSize?: number;
  status?: MemberStatus;
  plan?: PlanType;
  q?: string;
}

export interface MemberListResult {
  rows: Member[];
  meta: PageMeta;
}

export interface UpdateMemberInput {
  name?: string;
  status?: MemberStatus;
  role?: 'ADMIN' | 'AGENT' | 'MEMBER';
}

export interface UpdateSubscriptionInput {
  plan?: PlanType;
  status?: SubscriptionStatus;
  endDate?: string | null;
}

// ───────────────────────── Members ─────────────────────────

export async function listMembers(params: MemberListParams): Promise<MemberListResult> {
  const { data } = await api.get<ApiEnvelope<MemberListResult>>('/members', { params });
  return data.data;
}

export async function getMember(id: string): Promise<Member> {
  const { data } = await api.get<ApiEnvelope<Member>>(`/members/${id}`);
  return data.data;
}

export async function updateMember(id: string, input: UpdateMemberInput): Promise<Member> {
  const { data } = await api.patch<ApiEnvelope<Member>>(`/members/${id}`, input);
  return data.data;
}

export async function suspendMember(id: string): Promise<Member> {
  const { data } = await api.post<ApiEnvelope<Member>>(`/members/${id}/suspend`);
  return data.data;
}

export async function activateMember(id: string): Promise<Member> {
  const { data } = await api.post<ApiEnvelope<Member>>(`/members/${id}/activate`);
  return data.data;
}

export async function deleteMember(id: string): Promise<void> {
  await api.delete(`/members/${id}`);
}

// ───────────────────────── Subscriptions ─────────────────────────

export async function getSubscription(id: string): Promise<Subscription> {
  const { data } = await api.get<ApiEnvelope<Subscription>>(`/members/subscriptions/${id}`);
  return data.data;
}

export async function updateSubscription(id: string, input: UpdateSubscriptionInput): Promise<Subscription> {
  const { data } = await api.patch<ApiEnvelope<Subscription>>(`/members/subscriptions/${id}`, input);
  return data.data;
}
