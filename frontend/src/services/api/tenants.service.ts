import { api } from './http-client';
import type { ApiEnvelope, TenantProfile } from '@/types/api';

/** Serviço de tenants — espelha backend/src/modules/tenants (scope do tenant da sessão). */

export async function getMyTenant(): Promise<TenantProfile> {
  const { data } = await api.get<ApiEnvelope<TenantProfile>>('/tenants/me');
  return data.data;
}
