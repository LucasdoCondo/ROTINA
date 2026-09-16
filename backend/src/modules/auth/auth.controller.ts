import type { Response, Request } from 'express';
import { asyncHandler } from '../../middlewares/http.js';
import type { ValidatedRequest } from '../../types/http.js';
import { clientMetaFrom } from '../../types/models.js';
import { authService } from './auth.service.js';
import { clearSessionCookies } from '../../middlewares/auth.js';
import { UnauthorizedError } from '../../shared/errors.js';
import { env } from '../../config/env.js';
import type {
  LoginInput,
  RegisterInput,
} from './auth.schema.js';

/** Cookie seguro: httpOnly + SameSite=Lax. Secure apenas em produção. */
function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const secure = process.env.NODE_ENV === 'production';
  res.cookie('rotina_access', accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000, // 15 min (alinhado ao JWT_ACCESS_TTL)
    path: '/',
  });
  res.cookie('rotina_refresh', refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000, // 7 dias
    path: '/api/v1/auth/refresh-token',
  });
}

/** POST /api/v1/auth/register-tenant */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const body = (req as ValidatedRequest).validated.body as RegisterInput;
  const result = await authService.register(body, clientMetaFrom(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);
  res.status(201).json({
    success: true,
    data: {
      expiresIn: result.expiresIn,
      user: result.user,
      tenant: result.tenant,
    },
  });
});

/** POST /api/v1/auth/login */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const body = (req as ValidatedRequest).validated.body as LoginInput;
  const result = await authService.login(body, clientMetaFrom(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);
  res.json({
    success: true,
    data: {
      expiresIn: result.expiresIn,
      user: result.user,
      tenant: result.tenant,
    },
  });
});

/** POST /api/v1/auth/refresh-token */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  // O refresh token é httpOnly — o frontend NÃO pode ler/reenviar.
  // O backend lê do cookie enviado automaticamente pelo browser/axios.
  const cookieToken = req.cookies?.rotina_refresh;
  if (!cookieToken) {
    throw new UnauthorizedError('Missing refresh token cookie');
  }
  const result = await authService.refresh(cookieToken, clientMetaFrom(req));
  setAuthCookies(res, result.accessToken, result.refreshToken);
  res.json({
    success: true,
    data: {
      expiresIn: result.expiresIn,
      user: result.user,
      tenant: result.tenant,
    },
  });
});

/** POST /api/v1/auth/logout */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  // O refresh token é httpOnly — o frontend NÃO pode ler/reenviar.
  // O backend lê do cookie enviado automaticamente pelo browser/axios.
  // Se o cookie não estiver presente, não há sessão a revogar (safe no-op).
  const cookieToken = req.cookies?.rotina_refresh;
  if (cookieToken) {
    await authService.logout(cookieToken);
  }
  clearSessionCookies(res);
  res.json({ success: true, data: null });
});
