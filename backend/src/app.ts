import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env, IS_PRODUCTION } from './config/env.js';
import { httpLogger } from './shared/logger.js';
import { v1Router } from './routes/v1.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';

/**
 * Factory de la aplicación Express.
 * Se mantiene separada de server.ts para poder testear la app sin abrir
 * puerto (Etapa de testing: supertest).
 */
export function createApp(): Express {
  const app = express();

  // Detección de IP real tras proxies (requisito del rate-limiter).
  app.set('trust proxy', env.TRUST_PROXY);
  app.disable('x-powered-by');

  // Seguridad HTTP (OWASP A05): headers seguros, no info de servidor.
  app.use(helmet());

  // CORS: en dev "*" refleja el origen (permite credentials); en producción
  // debe configurarse una lista explícita de orígenes.
  const corsOptions: cors.CorsOptions =
    env.CORS_ORIGINS === '*'
      ? { origin: true, credentials: true }
      : { origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()), credentials: true };
  app.use(cors(corsOptions));

  // Body parsing con límite (evita payloads abusivos).
  app.use(express.json({ limit: '1mb' }));

  // Logging estructurado con request-id (x-request-id).
  app.use(httpLogger);

  // API v1
  app.use('/api/v1', v1Router);

  // 404 + error handler global (SIEMPRE al final).
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}