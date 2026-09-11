import { Router } from 'express';
import { validate } from '../../middlewares/http.js';
import { authRateLimiter } from '../../middlewares/rate-limit.js';
import { login, logout, refresh, register } from './auth.controller.js';
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from './auth.schema.js';

export const authRoutes = Router();

// Endpoints PÚBLICOS de autenticación (fuera del scope de tenant).
// Rate limiting estricto por IP contra fuerza bruta (OWASP A07).
authRoutes.post('/register-tenant', authRateLimiter, validate(registerSchema, 'body'), register);
authRoutes.post('/login', authRateLimiter, validate(loginSchema, 'body'), login);
authRoutes.post('/refresh-token', authRateLimiter, validate(refreshSchema, 'body'), refresh);
authRoutes.post('/logout', authRateLimiter, validate(logoutSchema, 'body'), logout);