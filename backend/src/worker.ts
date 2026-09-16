/**
 * ────────────────────────────────────────────────────────────
 *  ROTINA — Processo de BACKGROUND isolado (não roda na Vercel)
 * ─────────────────────────────────────────────────────────────
 *
 *  Por que existe: a Vercel congela a instância da Function após cada
 *  request/response, então workers BullMQ (conexões long-lived) e jobs
 *  periódicos NÃO podem viver lá. Este processo é o "worker stateful":
 *
 *    • Workers BullMQ (e-mail, notificação) — backend/src/queues/workers.ts
 *    • Purga diária de dados expirados     — backend/src/jobs/purge-job.ts
 *
 *  Onde roda: serviço `worker` do docker-compose.prod.yml (OCI), com a mesma
 *  imagem do backend. Alternativa na Vercel: `crons` no vercel.json chamando
 *  GET /api/v1/internal/jobs/purge (protegido por CRON_SECRET).
 *
 *  Uso local:  npm run worker        (tsx watch do processo)
 *  Produção:   node dist/worker.js   (ver script worker:prod)
 * ─────────────────────────────────────────────────────────────
 */
import { env, IS_SERVERLESS } from './config/env.js';
import { prisma } from './config/prisma.js';
import { initRedis, closeRedis } from './config/redis.js';
import { closeQueues } from './config/queue.js';
import { startWorkers } from './queues/workers.js';
import { runPurgeJob } from './jobs/purge-job.js';
import { logger } from './shared/logger.js';

/** Intervalo da purga: 1x/dia (alinhado ao cron `0 3 * * *` da Vercel). */
const PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function main(): Promise<void> {
  if (IS_SERVERLESS) {
    logger.error('worker.ts não deve rodar em ambiente serverless — use o serviço da OCI');
    process.exit(1);
  }

  // Conexão explícita ao banco (fail-fast, igual ao server.ts).
  await prisma.$connect();
  logger.info('Worker: conexão com o banco estabelecida');

  // Cache distribuído (degradação silenciosa sem REDIS_URL).
  await initRedis();

  // Filas BullMQ — sem Redis os handlers viram no-op.
  startWorkers();

  // Purga diária. `unref()` deixa o timer não segurar o processso sozinho:
  // quem mantém o processo vivo são as conexões Redis/BullMQ.
  const purgeTimer = setInterval(() => {
    void runPurgeJob().catch((err: unknown) => {
      logger.error({ err }, 'Worker: purga agendada falhou');
    });
  }, PURGE_INTERVAL_MS);
  purgeTimer.unref();

  logger.info(
    { purgeIntervalHours: PURGE_INTERVAL_MS / 3_600_000, nodeEnv: env.NODE_ENV },
    'Worker: em execução (workers BullMQ + purga agendada)',
  );

  const shutdown = (signal: string): void => {
    logger.info({ signal }, 'Worker: encerrando');
    clearInterval(purgeTimer);
    void (async () => {
      await closeQueues();
      await closeRedis();
      await prisma.$disconnect();
      logger.info('Worker: encerrado com sucesso');
      process.exit(0);
    })();
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err: unknown) => {
  logger.fatal({ err }, 'Worker: falha fatal no boot');
  process.exit(1);
});