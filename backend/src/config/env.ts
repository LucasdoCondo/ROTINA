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

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET debe tener al menos 32 caracteres'),
  JWT_ACCESS_TTL: z.string().default('15m'),

  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),

  ARGON2_MEMORY_KB: z.coerce.number().int().min(19456).default(65_536),
  ARGON2_TIME_COST: z.coerce.number().int().min(1).max(10).default(3),
  ARGON2_PARALLELISM: z.coerce.number().int().min(1).max(8).default(1),

  CORS_ORIGINS: z.string().default('*'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('; ');
  throw new Error(`Configuración de entorno inválida → ${issues}`);
}

export const env: z.infer<typeof EnvSchema> = parsed.data;

export const IS_PRODUCTION = env.NODE_ENV === 'production';