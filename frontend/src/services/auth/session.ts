import type { SessionUser, TenantSummary } from '@/types/api';

/**
 * Persistência da sessão no localStorage.
 * Módulo "burro" (sem React/axios) para poder ser importado pelo
 * http-client (interceptors) e pelo AuthContext sem ciclos.
 *
 * Trade-off consciente: tokens no localStorage ficam expostos a XSS.
 * A mitigação adotada é o access token de curta duração (15m) + refresh
 * rotativo com detecção de reuso no backend. Migração para cookies
 * httpOnly fica para a etapa de hardening.
 */

const KEYS = {
  accessToken: 'rotina.accessToken',
  refreshToken: 'rotina.refreshToken',
  user: 'rotina.user',
  tenant: 'rotina.tenant',
} as const;

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
  tenant: TenantSummary;
}

export function saveSession(session: StoredSession): void {
  localStorage.setItem(KEYS.accessToken, session.accessToken);
  localStorage.setItem(KEYS.refreshToken, session.refreshToken);
  localStorage.setItem(KEYS.user, JSON.stringify(session.user));
  localStorage.setItem(KEYS.tenant, JSON.stringify(session.tenant));
}

export function loadSession(): StoredSession | null {
  const accessToken = localStorage.getItem(KEYS.accessToken);
  const refreshToken = localStorage.getItem(KEYS.refreshToken);
  if (!accessToken || !refreshToken) return null;

  try {
    const user = JSON.parse(localStorage.getItem(KEYS.user) ?? 'null') as SessionUser | null;
    const tenant = JSON.parse(localStorage.getItem(KEYS.tenant) ?? 'null') as TenantSummary | null;
    if (!user?.id || !tenant?.id) return null;
    return { accessToken, refreshToken, user, tenant };
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(KEYS.accessToken);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(KEYS.refreshToken);
}

/** id do tenant da sessão — injetado como header X-Tenant-ID nos requests. */
export function getSessionTenantId(): string | null {
  try {
    const raw = localStorage.getItem(KEYS.tenant);
    if (!raw) return null;
    const tenant = JSON.parse(raw) as TenantSummary;
    return tenant?.id ?? null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  for (const key of Object.values(KEYS)) {
    localStorage.removeItem(key);
  }
}
