import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { UserRoleValue, UserStatusValue } from '../domain/constants.js';

/**
 * Emisión y verificación de JWT de acceso (HS256).
 * Las claims relevantes para multi-tenant (tenantId, role, status) se incrustan
 * en el token para que los middlewares no consulten la BD en cada request.
 */

export interface AccessTokenPayload {
  sub: string;
  tenantId: string;
  role: UserRoleValue;
  status: UserStatusValue;
  type: 'access';
  iat: number;
  exp: number;
}

export interface TokenUser {
  id: string;
  tenantId: string;
  role: UserRoleValue;
  status: UserStatusValue;
}

export function signAccessToken(user: TokenUser): string {
  const options: SignOptions = {
    algorithm: 'HS256',
    // TTL estilo "15m" viene de env; jsonwebtoken lo acepta como StringValue
    expiresIn: env.JWT_ACCESS_TTL as unknown as SignOptions['expiresIn'],
    issuer: 'rotina:auth',
    audience: 'rotina:api',
    subject: user.id,
  };

  return jwt.sign(
    { tenantId: user.tenantId, role: user.role, status: user.status, type: 'access' },
    env.JWT_ACCESS_SECRET,
    options,
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
    issuer: 'rotina:auth',
    audience: 'rotina:api',
  });

  if (typeof payload === 'string') {
    throw new Error('Unexpected string JWT payload');
  }
  if (payload.type !== 'access') {
    throw new Error('Token type is not access');
  }
  return payload as AccessTokenPayload;
}