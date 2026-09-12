import type { RequestHandler } from 'express';
import { ForbiddenError, UnauthorizedError } from '../shared/errors.js';
import type { UserRoleValue } from '../domain/constants.js';
import { verifyAccessToken } from '../shared/jwt.js';
import type { AuthUser } from '../types/http.js';

/** Nome dos cookies httpOnly emitidos pelo backend. */
const ACCESS_COOKIE = 'rotina_access';
const REFRESH_COOKIE = 'rotina_refresh';

/**
 * Middleware de autenticação.
 *
 * Aceita token de duas fontes (na ordem):
 *  1. Authorization: Bearer <jwt> (clients que não usam cookies)
 *  2. Cookie httpOnly `rotina_access` (browser + axios withCredentials)
 *
 * Adjunta `req.auth` com claims (userId, tenantId, role, status) para que
 * os middlewares posteriores (tenantIsolation, RBAC) trabalhem sem BD.
 */
export const authRequired: RequestHandler = (req, res, next) => {
  let token: string | undefined;

  // 1. Bearer header (prioridade — compatibilidade com clients legados)
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    token = header.slice('Bearer '.length).trim();
  }

  // 2. Cookie httpOnly (fallback — axios withCredentials / browser)
  if (!token) {
    const cookie = req.cookies?.[ACCESS_COOKIE];
    if (typeof cookie === 'string' && cookie.length > 0) {
      token = cookie;
    }
  }

  if (!token) {
    next(new UnauthorizedError('Missing authentication token'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const auth: AuthUser = {
      userId: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
      status: payload.status,
    };
    (req as { auth?: AuthUser }).auth = auth;
    res.locals.auth = auth;
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

/**
 * Middleware RBAC: restringe la ruta a los roles indicados.
 * Uso: router.patch('/:id', requireRole('ADMIN'), handler)
 */
export function requireRole(...roles: UserRoleValue[]): RequestHandler {
  return (req, _res, next) => {
    const auth = (req as { auth?: AuthUser }).auth;
    if (!auth) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }
    if (!roles.includes(auth.role)) {
      next(new ForbiddenError(`Requires role: ${roles.join(' | ')}`));
      return;
    }
    next();
  };
}

/** Requiere que el usuario esté ACTIVO (además de autenticado). */
export const requireActiveUser: RequestHandler = (req, res, next) => {
  const auth = (req as { auth?: AuthUser }).auth;
  if (!auth) {
    next(new UnauthorizedError('Authentication required'));
    return;
  }
  if (auth.status !== 'ACTIVE') {
    next(new ForbiddenError('User is not active'));
    return;
  }
  next();
};

/** Limpa os cookies de sessão (usado no logout). */
export function clearSessionCookies(res: { clearCookie(name: string, opts?: Record<string, unknown>): void }): void {
  const secure = process.env.NODE_ENV === 'production';
  res.clearCookie(ACCESS_COOKIE, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  });
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api/v1/auth/refresh-token',
  });
}