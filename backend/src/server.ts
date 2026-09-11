import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { logger } from './shared/logger.js';

export async function bootstrap(): Promise<void> {
  // Conexión explícita a la BD (fail-fast si no hay base de datos).
  await prisma.$connect();
  logger.info('Database connection established');

  const app = createApp();
  const server = app.listen(env.PORT, env.HOST, () => {
    logger.info({ host: env.HOST, port: env.PORT, env: env.NODE_ENV }, 'ROTINA API listening');
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully');
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Bye');
      process.exit(0);
    });
    // Fuerza de salida si la desconexión se cuelga (10s).
    setTimeout(() => process.exit(1), 10_000).unref?.();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// server.ts es el entrypoint real del proceso: siempre arranca.
bootstrap().catch((err: unknown) => {
  logger.fatal({ err }, 'Fatal error during bootstrap');
  process.exit(1);
});