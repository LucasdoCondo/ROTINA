import { config } from 'dotenv';
config({ path: '.env' });

// Força ambiente de teste e aponta para schema isolado.
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-test-access-secret-32';
process.env.JWT_ACCESS_TTL = '15m';
process.env.ARGON2_MEMORY_KB = String(19_456); // minimo recomendado (mais rápido em teste)
process.env.ARGON2_TIME_COST = String(2);
process.env.ARGON2_PARALLELISM = String(1);

// Banco de testes: usa schema rotina_test. Se DATABASE_URL não definir
// schema=test, ajusta automaticamente (assume PostgreSQL padrão do projeto).
const url = process.env.DATABASE_URL;
if (!url) {
  // Fallback local — deve ser sobrescrito pelo .env ou CI.
  process.env.DATABASE_URL =
    'postgresql://rotina:rotina@localhost:5432/rotina_dev?schema=rotina_test';
} else if (!/[?&]schema=/.test(url)) {
  process.env.DATABASE_URL = url.includes('?')
    ? `${url}&schema=rotina_test`
    : `${url}?schema=rotina_test`;
}
