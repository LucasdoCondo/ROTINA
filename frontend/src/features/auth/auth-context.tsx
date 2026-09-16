import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as authService from '@/services/api/auth.service';
import { clearSession, loadSession, saveSession } from '@/services/auth/session';
import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  SessionUser,
  TenantSummary,
  UserRole,
} from '@/types/api';

/**
 * Estado global de autenticação (Context + localStorage).
 * A sessão é hidratada de forma síncrona na inicialização — sem "flash"
 * de login nem estado de loading no boot.
 * O cache do TanStack Query é limpo em login/logout para nunca vazar
 * dados entre sessões (e futuramente, entre tenants).
 *
 * Nota de segurança (httpOnly cookies):
 *   - Tokens de acesso/refresh são httpOnly cookies gerenciados pelo backend.
 *   - O frontend NÃO lê nem repassa esses tokens: o browser/Axios
 *     (withCredentials: true) envia os cookies automaticamente; o backend
 *       lê o refresh token do cookie `rotina_refresh` no refresh/logout.
 *   - O que resta no localStorage são dados não-sensíveis (user, tenant)
 *     usados pelo React para hydrated state sinônimo sem flash.
 */
type AuthStatus = 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  tenant: TenantSummary | null;
  login: (input: LoginInput) => Promise<void>;
  registerTenant: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  /** RBAC flat, com a mesma semântica do requireRole do backend. */
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Estado persistido: APENAS dados não-sensíveis da sessão.
 * Tokens são httpOnly cookies — não fluem pelo localStorage.
 */
interface PersistedState {
  user: SessionUser;
  tenant: TenantSummary;
}

function loadPersisted(): PersistedState | null {
  const session = loadSession();
  return session ? { user: session.user, tenant: session.tenant } : null;
}

/**
 * Persiste apenas os dados não-sensíveis da sessão (user, tenant).
 * Tokens (accessToken, refreshToken) são httpOnly cookies — não salvamos
 * nada disso no localStorage (o frontend não lê cookies httpOnly).
 */
function persist(result: AuthResponse): void {
  saveSession(result.user, result.tenant);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<PersistedState | null>(loadPersisted);

  const applyAuth = useCallback(
    (result: AuthResponse) => {
      // Só persistimos dados não-sensíveis; tokens são httpOnly cookies.
      persist(result);
      queryClient.clear();
      setState({ user: result.user, tenant: result.tenant });
    },
    [queryClient],
  );

  const login = useCallback(
    async (input: LoginInput) => {
      const result = await authService.login(input);
      applyAuth(result);
    },
    [applyAuth],
  );

  const registerTenant = useCallback(
    async (input: RegisterInput) => {
      const result = await authService.registerTenant(input);
      applyAuth(result);
    },
    [applyAuth],
  );

  const logout = useCallback(async () => {
    try {
      // Best-effort: revoga a sessão no backend; falha de rede não impede
      // o logout local. O refresh token é httpOnly (cookie) — enviado
      // automaticamente pelo axios com withCredentials: true.
      await authService.logout();
    } catch {
      // ignorado de propósito (ver comentário acima)
    } finally {
      clearSession();
      queryClient.clear();
      setState(null);
    }
  }, [queryClient]);

  const hasRole = useCallback(
    (roles: UserRole[]) => {
      if (!state) return false;
      return roles.includes(state.user.role);
    },
    [state],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status: state ? 'authenticated' : 'unauthenticated',
      user: state?.user ?? null,
      tenant: state?.tenant ?? null,
      login,
      registerTenant,
      logout,
      hasRole,
    }),
    [state, login, registerTenant, logout, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  }
  return context;
}
