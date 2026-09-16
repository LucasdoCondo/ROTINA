import { api } from './http-client';
import type { ApiEnvelope, AuthResponse, LoginInput, RegisterInput } from '@/types/api';

/**
 * Serviço de autenticação — espelha os endpoints de backend/src/modules/auth.
 * Respostas: { accessToken, refreshToken, expiresIn, user, tenant }.
 *
 * Nota: A autenticação é feita via cookies httpOnly (`rotina_access`,
 * `rotina_refresh`), gerenciados pelo backend e enviados automaticamente
 * pelo axios com `withCredentials: true`. O frontend NÃO lê nem passa
 * esses cookies.
 */

export async function login(input: LoginInput): Promise<AuthResponse> {
  const { data } = await api.post<ApiEnvelope<AuthResponse>>('/auth/login', input);
  return data.data;
}

export async function registerTenant(input: RegisterInput): Promise<AuthResponse> {
  const { data } = await api.post<ApiEnvelope<AuthResponse>>('/auth/register-tenant', input);
  return data.data;
}

/** Revoga a sessão. O refresh token é httpOnly (cookie) — backend o lê automaticamente. */
export async function logout(): Promise<void> {
  // POST vazio: o cookie `rotina_refresh` é enviado automaticamente pelo axios.
  await api.post('/auth/logout');
}
