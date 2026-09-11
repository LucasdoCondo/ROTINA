const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
  // Pool de conexões é controlado via DATABASE_URL (?connection_limit=5).
  // PrismaClient não aceita a propriedade `pool` — ela quebrava o require().
  // Para Neon/pgbouncer use ?pgbouncer=true na URL.
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;