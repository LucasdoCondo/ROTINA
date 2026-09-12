import { prisma } from '../config/prisma.js';
import { logger } from '../shared/logger.js';

/**
 * Job de purga de dados expirados/deletados.
 *
 * Hard-delete de:
 *  1. Registros com deletedAt > 30 dias (soft delete → hard delete)
 *  2. Refresh tokens expirados ou revogados há > 7 dias
 *
 * Deve ser agendado via Cron (ex: todo dia às 3h) ou
 * executado como processo separado.
 *
 * Ordem de deleção respeita dependências FK (child tables antes de parents).
 *
 * NOTA: Apenas tabelas com coluna `deletedAt` (soft delete) são purgadas.
 * Tabelas como `refreshToken`, `ticketMessage`, `orderItem` não têm soft
 * delete — o primeiro é purgado por expiração/revogação, os outros são
 * deletados em cascade pelo Prisma quando o parent é hard-deletado.
 */

const SOFT_DELETE_RETENTION_DAYS = 30;
const REFRESH_TOKEN_RETENTION_DAYS = 7;

// Ordem respeita FK: children antes de parents.
// Apenas tabelas com coluna `deletedAt` (soft delete).
const TABLES_TO_PURGE = [
  // ─── Soft-deletable business tables (child first) ───
  { model: 'ticket', label: 'tickets' },
  { model: 'deal', label: 'deals' },
  { model: 'customer', label: 'customers' },
  { model: 'product', label: 'products' },
  { model: 'subscription', label: 'subscriptions' },
  { model: 'invitation', label: 'invitations' },
  { model: 'order', label: 'orders' },

  // ─── User (cascade para refreshToken, children em outras tabelas) ───
  { model: 'user', label: 'users' },

  // ─── Tenant (último, pois é o root) ───
  { model: 'tenant', label: 'tenants' },
];

export async function runPurgeJob(): Promise<void> {
  const startedAt = new Date();
  logger.info('Purge job iniciado');

  try {
    // ── 1. Purga refresh tokens expirados/revogados ──────────────────────
    const tokenCutoff = new Date(
      Date.now() - REFRESH_TOKEN_RETENTION_DAYS * 86_400_000,
    );

    const deletedTokens = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: tokenCutoff } },
          { revokedAt: { lt: tokenCutoff } },
        ],
      },
    });

    logger.info(
      { count: deletedTokens.count },
      'Refresh tokens purgados',
    );

    // ── 2. Hard delete: soft-deleted > SOFT_DELETE_RETENTION_DAYS ─────────
    const purgeCutoff = new Date(
      Date.now() - SOFT_DELETE_RETENTION_DAYS * 86_400_000,
    );

    let totalPurged = 0;

    for (const { model, label } of TABLES_TO_PURGE) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (prisma as any)[model].deleteMany({
          where: { deletedAt: { lt: purgeCutoff } },
        });
        if (result.count > 0) {
          logger.info(
            { model: label, count: result.count },
            `Registros purgados de ${label}`,
          );
          totalPurged += result.count;
        }
      } catch (err: unknown) {
        const errCode = (err as { code?: string }).code;
        // P2003 = FK violation, P2025 = record not found (ignore)
        if (errCode !== 'P2003' && errCode !== 'P2025') {
          logger.warn({ model: label, err }, `Falha ao purgar ${label}`);
        }
      }
    }

    logger.info(
      {
        durationMs: Date.now() - startedAt.getTime(),
        totalPurged,
        deletedTokens: deletedTokens.count,
      },
      'Purge job concluído',
    );
  } catch (err) {
    logger.error({ err }, 'Purge job falhou');
    throw err;
  }
}

// Se executado diretamente: `node dist/jobs/purge-job.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  runPurgeJob()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
