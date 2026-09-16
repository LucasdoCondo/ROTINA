import { Router, type Request, type RequestHandler } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from '../shared/logger.js';
import { asyncHandler } from '../middlewares/http.js';
import { runPurgeJob } from '../jobs/purge-job.js';

/**
 * Rotas INTERNAS de operação (jobs agendados).
 *
 * Montadas ANTES do `authRequired`/`tenantIsolation`: não usam JWT de usuário,
 * o acesso é protegido por segredo compartilhado.
 *
 * Consumidores:
 *  1. Vercel Cron Jobs (vercel.json → `crons`): a Vercel dispara um GET e,
 *     quando a env `CRON_SECRET` existe no projeto, envia
 *     `Authorization: Bearer <CRON_SECRET>`.
 *  2. OCI / operador: `curl -H "x-internal-secret: <valor>"`.
 *
 * Sem nenhum segredo configurado o endpoint fica DESABILITADO (503) — evita
 * expor um job destrutivo (hard delete) sem autenticação. Em desenvolvimento,
 * use `npm run job:purge` (processo isolado, sem HTTP).
 */

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

function providedSecret(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice('Bearer '.length).trim();
  }
  const header = req.headers['x-internal-secret'];
  if (typeof header === 'string' && header.length > 0) {
    return header;
  }
  return null;
}

const requireJobSecret: RequestHandler = (req, res, next) => {
  const esperados = [env.CRON_SECRET, env.INTERNAL_CRON_SECRET].filter(
    (segredo): segredo is string => typeof segredo === 'string' && segredo.length > 0,
  );

  if (esperados.length === 0) {
    logger.error(
      'Endpoint interno de jobs desabilitado: defina CRON_SECRET ou INTERNAL_CRON_SECRET',
    );
    res.status(503).json({
      success: false,
      error: {
        code: 'JOBS_DISABLED',
        message: 'Internal jobs endpoint is disabled (no secret configured)',
      },
    });
    return;
  }

  const recebido = providedSecret(req);
  if (!recebido || !esperados.some((esperado) => safeEqual(esperado, recebido))) {
    logger.warn(
      { ip: req.ip, path: req.path },
      'Acesso ao endpoint interno de jobs sem segredo válido',
    );
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or missing job secret' },
    });
    return;
  }

  next();
};

/** Executa a purga de dados expirados (soft delete > 30 dias + tokens). */
const runPurge: RequestHandler = asyncHandler(async (_req, res) => {
  const startedAt = new Date();
  await runPurgeJob();
  const finishedAt = new Date();

  res.json({
    success: true,
    data: {
      job: 'purge',
      startedAt,
      finishedAt,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
    },
  });
});

export const internalRoutes = Router();

// GET  → Vercel Cron Jobs (vercel.json → crons)
// POST → execução manual/OCI (curl)
internalRoutes.get('/jobs/purge', requireJobSecret, runPurge);
internalRoutes.post('/jobs/purge', requireJobSecret, runPurge);
