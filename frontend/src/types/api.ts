/**
 * Tipos compartilhados do frontend, espelhando os contratos do backend
 * (envelope `ApiEnvelope`, roles, payloads de sessão e perfil do tenant).
 */

export type UserRole = 'ADMIN' | 'AGENT' | 'MEMBER';

/** Envelope de sucesso da API (backend/src/types/http.ts). */
export interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

/** Envelope de erro da API (error-handler global do backend). */
export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

/** Erro normalizado para consumo na UI. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(
    message: string,
    status: number,
    code: string,
    details?: unknown,
    requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

/** Usuário da sessão (payload `user` de login/refresh). */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

/** Tenant resumido (payload `tenant` de login/refresh). */
export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  deletedAt: string | null;
}

/** Resposta dos endpoints de sessão; os tokens ficam apenas em cookies httpOnly. */
export interface AuthResponse {
  /** Janela de expiração do access token (JWT_ACCESS_TTL = 15m = 900s). */
  expiresIn: number;
  user: SessionUser;
  tenant: TenantSummary;
}

/** POST /auth/login */
export interface LoginInput {
  tenantSlug: string;
  email: string;
  password: string;
}

/** POST /auth/register-tenant */
export interface RegisterInput {
  tenantName: string;
  tenantSlug: string;
  adminName: string;
  adminEmail: string;
  password: string;
}

/** GET /tenants/me */
export interface TenantProfile {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  contactEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Paginação padrão das listagens da API (campo `meta`). */
export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Rótulos amigáveis por role (badges da UI). */
export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  AGENT: 'Agente',
  MEMBER: 'Membro',
};
