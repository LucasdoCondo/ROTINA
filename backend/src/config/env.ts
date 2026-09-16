import { z } from 'zod';
import 'dotenv/config';

/**
 * Configuración de entorno validada con Zod.
 * El proceso aborta en el arranque si falta una variable crítica
 * (fail-fast: nunca arrancar un servicio mal configurado).
 */

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(1),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  // Conexión DIRECTA del Neon (sin `-pooler`): la usa la CLI de Prisma
  // (migrate/generate). El schema la referencia → debe existir en TODOS los
  // entornos (Vercel, CI, build do Docker…). Ver backend/.env.example.
  DIRECT_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET debe tener al menos 32 caracteres'),
  JWT_ACCESS_TTL: z.string().default('15m'),

  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),

  // Payment gateway (webhooks firmados con HMAC-SHA256)
  PAYMENT_PROVIDER: z
    .enum(['STRIPE', 'MERCADOPAGO', 'PAGARME', 'MANUAL'])
    .default('MANUAL'),
  PAYMENT_WEBHOOK_SECRET: z.string().default('dev-webhook-secret-change-me'),
  // URL pública del webhook (p. ej. https://api.rotina.dev/api/v1/payments/webhook)
  PAYMENT_WEBHOOK_URL: z.string().default(''),

  // BullMQ (colas Redis)
  QUEUE_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(4),
  EMAIL_FROM: z.string().default('no-reply@rotina.dev'),

  ARGON2_MEMORY_KB: z.coerce.number().int().min(19456).default(65_536),
  ARGON2_TIME_COST: z.coerce.number().int().min(1).max(10).default(3),
  ARGON2_PARALLELISM: z.coerce.number().int().min(1).max(8).default(1),

  CORS_ORIGINS: z.string().default('*'),

  // Segredos do endpoint interno de jobs (/api/v1/internal/jobs/*):
  //   CRON_SECRET          → a Vercel Cron envia `Authorization: Bearer <valor>`
  //   INTERNAL_CRON_SECRET → chamadas manuais/OCI via `x-internal-secret`
  // Sem nenhum dos dois, o endpoint responde 503 (desabilitado por segurança).
  CRON_SECRET: z.string().min(16).optional(),
  INTERNAL_CRON_SECRET: z.string().min(16).optional(),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
});

// Compatibilidade com as variáveis já configuradas no projeto Vercel.
// O código usa nomes explícitos, mas instalações anteriores ainda fornecem
// JWT_SECRET e CORS_ORIGIN. Normalizamos uma vez antes da validação para que
// o deploy não quebre durante o cold start da Function.
const runtimeEnv = { ...process.env };
if (!runtimeEnv.JWT_ACCESS_SECRET && runtimeEnv.JWT_SECRET) {
  runtimeEnv.JWT_ACCESS_SECRET = runtimeEnv.JWT_SECRET;
}
if (!runtimeEnv.CORS_ORIGINS && runtimeEnv.CORS_ORIGIN) {
  runtimeEnv.CORS_ORIGINS = runtimeEnv.CORS_ORIGIN;
}
if (!runtimeEnv.JWT_ACCESS_TTL && runtimeEnv.JWT_EXPIRES_IN) {
  runtimeEnv.JWT_ACCESS_TTL = runtimeEnv.JWT_EXPIRES_IN;
}

const parsed = EnvSchema.safeParse(runtimeEnv);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('; ');
  throw new Error(`Configuración de entorno inválida → ${issues}`);
}

export const env: z.infer<typeof EnvSchema> = parsed.data;

export const IS_PRODUCTION = env.NODE_ENV === 'production';

/**
 * true quando a API roda como Function/Serverless (Vercel).
 *
 * Nesse modo NÃO existem processos long-lived: `app.listen()` não é chamado,
 * não há workers BullMQ nem cron interno. O que não roda na Vercel:
 *   - backend/src/queues/workers.ts  → processo `backend/src/worker.ts` (OCI)
 *   - backend/src/jobs/purge-job.ts  → Vercel Cron (endpoint interno) ou OCI
 */
export const IS_SERVERLESS = Boolean(process.env.VERCEL) || process.env.SERVERLESS === '1';
