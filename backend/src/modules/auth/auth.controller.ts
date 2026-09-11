import type { Response, Request } from 'express';
import { asyncHandler } from '../../middlewares/http.js';
import type { ValidatedRequest } from '../../types/http.js';
import { clientMetaFrom } from '../../types/models.js';
import { authService } from './auth.service.js';
import type {
  LoginInput,
  RegisterInput,
} from './auth.schema.js';

/** POST /api/v1/auth/register */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const body = (req as ValidatedRequest).validated.body as RegisterInput;
  const result = await authService.register(body, clientMetaFrom(req));
  res.status(201).json({ success: true, data: result });
});

/** POST /api/v1/auth/login */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const body = (req as ValidatedRequest).validated.body as LoginInput;
  const result = await authService.login(body, clientMetaFrom(req));
  res.json({ success: true, data: result });
});

/** POST /api/v1/auth/refresh */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = (req as ValidatedRequest).validated.body as {
    refreshToken: string;
  };
  const result = await authService.refresh(refreshToken, clientMetaFrom(req));
  res.json({ success: true, data: result });
});

/** POST /api/v1/auth/logout */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = (req as ValidatedRequest).validated.body as {
    refreshToken: string;
  };
  await authService.logout(refreshToken);
  res.json({ success: true, data: null });
});