import { prisma } from '../config/prisma.js';
import { getRedis, isRedisConnected } from '../config/redis.js';
import { logger } from './logger.js';
import type { TenantStatusValue } from '../domain/constants.js';

/**
 * Cache distribuído de tenant ATIVO usando Redis.
 * 
 * Substitui o Map local (que falha em multi-instância) por um cache
 * compartilhado. TTL de 30 segundos com invalidação explícita.
 * 
 * Padrão: Cache-Aside com fallback para o banco se Redis estiver indisponível.
 */

const KEY_PREFIX = 'rotina:tenant:';
const TTL_SECONDS = 30;

export const tenantCache = {
  async isActive(tenantId: string): Promise<boolean> {
    const key = `${KEY_PREFIX}${tenantId}`;

    // Tenta Redis primeiro (se disponível)
    if (isRedisConnected()) {
      const redis = getRedis();
      if (redis) {
        try {
          const cached = await redis.get(key);
          if (cached !== null) {
            const isActive = cached === '1';
            logger.debug({ tenantId, isActive, source: 'redis' }, 'Tenant cache hit');
            return isActive;
          }
        } catch (err) {
          logger.warn({ err, tenantId }, 'Redis get falhou, fallback para banco');
        }
      }
    }

    // Cache miss ou Redis indisponível: consulta o banco
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { id: true, status: true },
    });

    const isActive = tenant?.status === 'ACTIVE';

    // Popula o cache Redis (fire-and-forget, falha silenciosa)
    if (isRedisConnected()) {
      const redis = getRedis();
      if (redis) {
                await redis.setex(key, TTL_SECONDS, isActive ? '1' : '0').catch(() => {});
      }
    }

    logger.debug({ tenantId, isActive, source: 'database' }, 'Tenant cache miss');
    return isActive;
  },

  async invalidate(tenantId: string): Promise<void> {
    if (!isRedisConnected()) return;
    const redis = getRedis();
    if (!redis) return;
    
    const key = `${KEY_PREFIX}${tenantId}`;
    try {
      await redis.del(key);
      logger.debug({ tenantId }, 'Tenant cache invalidado');
    } catch (err) {
      logger.warn({ err, tenantId }, 'Falha ao invalidar cache do tenant');
    }
  },

  async invalidateAll(): Promise<void> {
    if (!isRedisConnected()) return;
    const redis = getRedis();
    if (!redis) return;

    try {
      const keys = await redis.keys(`${KEY_PREFIX}*`);
      if (keys.length > 0) {
        await redis.del(keys);
        logger.info({ count: keys.length }, 'Tenant cache completamente invalidado');
      }
    } catch (err) {
      logger.warn({ err }, 'Falha ao invalidar todo o cache de tenants');
    }
  },
};
