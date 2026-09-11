import type { Request } from 'express';
import type { UserRoleValue, UserStatusValue } from '../domain/constants.js';

/** Usuario autenticado (claims del access token JWT). */
export interface AuthUser {
  userId: string;
  tenantId: string;
  role: UserRoleValue;
  status: UserStatusValue;
}

/** Request que ya pasó por authRequired (y opcionalmente tenantIsolation). */
export interface AuthenticatedRequest extends Request {
  auth: AuthUser;
  tenant: { id: string };
}

/** Payloads validados por el middleware validate() (una bolsa por request). */
export interface ValidatedBag {
  body?: unknown;
  query?: unknown;
  params?: unknown;
}

/** Request con payload(s) validados. */
export interface ValidatedRequest extends Request {
  validated: ValidatedBag;
}

/** Envoltorio de respuesta estándar de la API. */
export interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}