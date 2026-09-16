import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { type ApiEnvelope, type ApiErrorBody, type AuthResponse } from '@/types/api';
import { ApiError } from '@/types/api';
import {
  clearSession,
  getSessionTenantId,
  saveSession,
} from '@/services/auth/session';

/**
 * Cliente HTTP central (Axios).
 *
 * - Request interceptor: injeta o header multi-tenant `X-Tenant-ID`
 *   (consumido pelo tenantIsolation do backend) em TODAS as requisições.
 * - Autenticação: feita via cookies httpOnly (`rotina_access`, `rotina_refresh`)
 *   gerenciados pelo backend e enviados automaticamente pelo navegador/axios
 *   com `withCredentials: true` — o frontend NÃO lê nem repassa esses cookies.
 * - Response interceptor: ante 401 em endpoint protegido, tenta UMA vez o
 *   refresh do access token (single-flight, com rotação no backend) e
 *   reinjeta os headers novos antes de reexecutar a request original.
 *   Se o refresh falhar (token revogado/reuso/vencido), a sessão é limpa e
 *   o usuário volta ao /login.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  // Em produção o padrão é um caminho RELATIVO (`/api/v1`): a própria Vercel
  // serve a SPA e a Function da API na MESMA origem (vercel.json → routes
  // `/api/(.*)` → `api/index.ts`), o que elimina CORS e cookies de terceiros.
  // Se a API rodar em outro host (ex.: OCI), defina VITE_API_URL na Vercel
  // (Environment Variables) — este valor é embutido no bundle em build time.
  (import.meta.env.PROD ? '/api/v1' : 'http://localhost:3000/api/v1');

const REQUEST_TIMEOUT_MS = 15_000;

/** Endpoints de sessão: 401 aqui NÃO deve disparar refresh (evita loop). */
const AUTH_FREE_URLS = ['/auth/login', '/auth/register-tenant', '/auth/refresh-token', '/auth/logout'];

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  withCredentials: true, // Envia cookies httpOnly automaticamente
});

// ───────────────────────── Request ─────────────────────────

api.interceptors.request.use((config) => {
  // O token de acesso é httpOnly (cookie) — não injetamos Authorization header.
  // O backend lê `rotina_access` do cookie quando não há Bearer.
  const tenantId = getSessionTenantId();
  if (tenantId) {
    config.headers['X-Tenant-ID'] = tenantId;
  }
  return config;
});

// ───────────────────────── Refresh (single-flight) ─────────────────────────

let refreshInFlight: Promise<boolean> | null = null;

/** Troca o par de tokens (rotação no backend). O refresh token é httpOnly,
 *  enviado automaticamente pelo axios via cookie — não passamos body. */
async function refreshSession(): Promise<boolean> {
  try {
    // Axios "cru" de propósito: sem interceptors (não dispara o próprio fluxo).
    // O cookie `rotina_refresh` é enviado automaticamente com withCredentials:true.
    const response = await axios.post<ApiEnvelope<AuthResponse>>(
      `${API_BASE_URL}/auth/refresh-token`,
      undefined,
      { timeout: REQUEST_TIMEOUT_MS },
    );
    const result = response.data.data;
    // Persiste apenas dados não-sensíveis (user, tenant). Tokens são httpOnly.
    saveSession(result.user, result.tenant);
    return true;
  } catch {
    return false;
  }
}

// ───────────────────────── Response ─────────────────────────

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const url = original?.url ?? '';

    const canRetry =
      error.response?.status === 401 &&
      original !== undefined &&
      !original._retry &&
      !AUTH_FREE_URLS.some((free) => url.includes(free));

    if (canRetry) {
      original!._retry = true;
      // Single-flight: requisições concorrentes 401 compartilham o MESMO refresh
      // (o backend rotaciona o token; dois refreshes paralelos = reuso detectado).
      refreshInFlight ??= refreshSession().finally(() => {
        refreshInFlight = null;
      });
      const refreshed = await refreshInFlight;

      if (refreshed) {
        // O access token é httpOnly (cookie) — não injetamos Authorization header.
        // O backend lê `rotina_access` do cookie quando não há Bearer.
        const tenantId = getSessionTenantId();
        if (tenantId) {
          original!.headers['X-Tenant-ID'] = tenantId;
        }
        return api(original!);
      }

      // Refresh inválido/revogado → sessão morta: volta ao login.
      clearSession();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }

    return Promise.reject(toApiError(error));
  },
);

/** Normaliza qualquer falha (rede, timeout, envelope de erro) em ApiError. */
export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const body = error.response?.data;
    const apiError = body?.error;
    return new ApiError(
      apiError?.message ?? error.message,
      error.response?.status ?? 0,
      apiError?.code ?? 'NETWORK_ERROR',
      apiError?.details,
      apiError?.requestId,
    );
  }
  return new ApiError(
    error instanceof Error ? error.message : 'Erro inesperado',
    0,
    'UNKNOWN',
  );
}
