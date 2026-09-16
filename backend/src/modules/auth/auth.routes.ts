import { Router } from 'express';
import { validate } from '../../middlewares/http.js';
import { authRateLimiter } from '../../middlewares/rate-limit.js';
import { login, logout, refresh, register } from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.schema.js';

export const authRoutes = Router();

// Endpoints PÚBLICOS de autenticación (fuera del scope de tenant).
// Rate limiting estricto por IP contra fuerza bruta (OWASP A07).
//
// Nota de seguridad: refresh-token y logout ahora lean el refresh token
// del cookie httpOnly `rotina_refresh` (enviado automáticamente por browser/Axios
// con `withCredentials: true`). Por eso no validamos body — el token no viaja
// en el cuerpo de la requisión.
authRoutes.post('/register-tenant', authRateLimiter, validate(registerSchema, 'body'), register);
authRoutes.post('/login', authRateLimiter, validate(loginSchema, 'body'), login);
authRoutes.post('/refresh-token', authRateLimiter, refresh);
authRoutes.post('/logout', authRateLimiter, logout);