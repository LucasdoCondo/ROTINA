import type { SessionUser, TenantSummary } from '@/types/api';

/**
 * Persistência de DADOS DA SESSÃO (não-secretos) no localStorage.
 *
 * Tokens de acesso/refresh são httpOnly cookies (gerenciados pelo backend).
 * O frontend não lê nem repassa esses tokens:
 *   - o browser/Axios (withCredentials: true) enviam os cookies automaticamente
 *   - o backend lê o refresh token do cookie `rotina_refresh` no refresh/logout
 *   - o access token é lido pelo backend do cookie `rotina_access` (ou Bearer,
 *     caso raro de client externo)
 *
 * O que resta no localStorage são dados não-sensíveis usados pelo React:
 *   - user  → perfil do usuário logado (name, email, role…)
 *   - tenant → resumo do tenant da sessão (id, slug, plan…)
 *
 * Esses dados não são secrets; a fonte de verdade continua sendo o backend.
 * O estado do React é hidratado a partir deles na inicialização (sem flash).
 */

const KEYS = {
  user: 'rotina.user',
  tenant: 'rotina.tenant',
} as const;

/** Estado persistido (dados não-sensíveis da sessão). */
export interface StoredSession {
  user: SessionUser;
  tenant: TenantSummary;
}

/** Salva os dados não-sensíveis da sessão (sem tokens). */
export function saveSession(user: SessionUser, tenant: TenantSummary): void {
  localStorage.setItem(KEYS.user, JSON.stringify(user));
  localStorage.setItem(KEYS.tenant, JSON.stringify(tenant));
}

/**
 * Recupera os dados persistidos da sessão.
 * Retorna null quando não há sessão válida (ex.: não logado, dados
 * corrompidos, ou refresh/token ausente — neste último, o session state
 * do React já estaria null de qualquer forma).
 */
export function loadSession(): StoredSession | null {
  try {
    const user = JSON.parse(localStorage.getItem(KEYS.user) ?? 'null') as SessionUser | null;
    const tenant = JSON.parse(localStorage.getItem(KEYS.tenant) ?? 'null') as TenantSummary | null;
    if (!user?.id || !tenant?.id) return null;
    return { user, tenant };
  } catch {
    return null;
  }
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

/** Remove os dados persistidos da sessão (sem tokens, claro). */
export function clearSession(): void {
  for (const key of Object.values(KEYS)) {
    localStorage.removeItem(key);
  }
}
