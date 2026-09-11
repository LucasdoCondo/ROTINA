import { api } from './http-client';
import type { ApiEnvelope, AuthResponse, LoginInput, RegisterInput } from '@/types/api';

/**
 * Serviço de autenticação — espelha os endpoints de backend/src/modules/auth.
 * Respostas: { accessToken, refreshToken, expiresIn, user, tenant }.
 */

export async function login(input: LoginInput): Promise<AuthResponse> {
  const { data } = await api.post<ApiEnvelope<AuthResponse>>('/auth/login', input);
  return data.data;
}

export async function registerTenant(input: RegisterInput): Promise<AuthResponse> {
  const { data } = await api.post<ApiEnvelope<AuthResponse>>('/auth/register-tenant', input);
  return data.data;
}

/** Revoga a sessão do refresh token informado (best-effort no chamador). */
export async function logout(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken });
}
