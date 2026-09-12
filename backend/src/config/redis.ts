import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from '../shared/logger.js';

/**
 * Cliente Redis singleton para cache distribuído.
 *
 * ioredis foi escolhido por sua robustez em ambientes Node.js:
 *  - Reconexão automática com backoff exponencial
 *  - Fallback gracioso: se Redis cair, operações de cache são no-ops
 *  - Health check integrado
 */

let redis: Redis | null = null;

export async function initRedis(): Promise<void> {
  if (!env.REDIS_URL) {
    logger.warn('REDIS_URL não configurado — cache Redis desabilitado');
    return;
  }

  try {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
      reconnectOnError: (err: Error) => {
        logger.error({ err }, 'Redis: erro de reconexão');
        return true;
      },
    });

    redis.on('error', (err: Error) => {
      logger.error({ err }, 'Redis: erro de conexão');
      redis = null;
    });

    redis.on('connect', () => {
      logger.info('Redis: conectado');
    });

    logger.info('Redis: cliente inicializado com sucesso');
  } catch (err) {
    logger.error({ err }, 'Falha ao inicializar Redis');
    redis = null;
  }
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Redis: conexão encerrada');
  }
}

export function getRedis(): Redis | null {
  return redis;
}

export function isRedisConnected(): boolean {
  if (!redis) return false;
  return redis.status === 'ready';
}

export async function redisPing(): Promise<boolean> {
  if (!redis) return false;
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}