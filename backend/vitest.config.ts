import { defineConfig } from 'vitest/config';

/**
 * Configuração do Vitest — testes de integração com Supertest.
 *
 * - pool: 'forks' (isolado por segurança com Prisma + ALS)
 * - testTimeout: 30s (criação de tenants + requests cruzados)
 * - hookTimeout: 60s (migrações manuais no banco de teste)
 *
 * O banco de testes é preparado em tests/helpers/test-context.ts:
 *   DATABASE_URL apontando para um schema isolado (rotina_test).
 */
export default defineConfig({
  test: {
    globals: false,
    pool: 'forks',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    setupFiles: ['src/__tests__/helpers/setup-env.ts'],
  },
});
