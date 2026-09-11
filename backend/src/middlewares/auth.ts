import type { RequestHandler } from 'express';
import { ForbiddenError, UnauthorizedError } from '../shared/errors.js';
import type { UserRoleValue } from '../domain/constants.js';
import { verifyAccessToken } from '../shared/jwt.js';
import type { AuthUser } from '../types/http.js';

/**
 * Middleware de autenticación: verifica el Access Token JWT (Bearer).
 * Adjunta `req.auth` con claims (userId, tenantId, role, status) para que
 * los middlewares posteriores (tenantIsolation, RBAC) trabajen sin BD.
 */
export const authRequired: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(new UnauthorizedError('Missing bearer token'));
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  if (token.length === 0) {
    next(new UnauthorizedError('Empty bearer token'));
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