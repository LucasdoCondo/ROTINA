import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { env } from '../config/env.js';

/**
 * Logger estructurado (pino).
 * Los campos sensibles (Authorization, passwords) se redactan automáticamente
 * para no volcar secretos en los logs.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    censor: '[REDACTED]',
    paths: [
      'req.headers.authorization',
      'req.headers["x-tenant-id"]',
      '*.password',
      '*.passwordHash',
      '*.refreshToken',
      '*.refreshHash',
    ],
  },
  base: { service: 'rotina-backend' },
});

/** Middleware de log de peticiones HTTP con request-id propio. */
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers['x-request-id'] ?? req.id;
    if (existing) {
      res.setHeader('x-request-id', String(existing));
      return String(existing);
    }
    const id = crypto.randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});