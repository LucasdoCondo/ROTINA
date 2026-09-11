import type { Request } from 'express';
import type { UserRoleValue } from '../domain/constants.js';
import type { UserStatusValue } from '../domain/constants.js';

/** Perfil público de un tenant (para respuestas de API). */
export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  deletedAt: Date | null;
}

/** Perfil público de un usuario (sin campos sensibles). */
export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRoleValue;
  status: UserStatusValue;
}

/** Metadata de cliente extraída de la request (para sesiones/auditoría). */
export interface RequestClientMeta {
  userAgent?: string;
  ipAddress?: string;
}

export function clientMetaFrom(req: Request): RequestClientMeta {
  return {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  };
}