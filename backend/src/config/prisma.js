const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
  // Limitar pool para Neon (pgbouncer evita muitas conexões)
  pool: {
    min: 2,
    max: 5,
  },
});

// Reconectar automaticamente se conexão for quebrada
prisma.$on('error', (e) => {
  console.error('Prisma Client error:', e);
});

// Middleware para medir performance e tratar erros de conexão
prisma.$use(async (params, next) => {
  const before = Date.now();
  try {
    const result = await next(params);
    const after = Date.now();

    if (process.env.NODE_ENV === 'development') {
      console.log(`Query ${params.model}.${params.action} took ${after - before}ms`);
    }

    return result;
  } catch (error) {
    if (error.message && error.message.includes('terminating connection')) {
      console.warn('Conexão perdida, reconectando...');
      try {
        await prisma.$connect();
        console.log('Reconexão OK');
      } catch (reconnectError) {
        console.error('Falha na reconexão:', reconnectError.message);
      }
    }
    throw error;
  }
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;