import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tables = await prisma.$queryRawUnsafe(
  `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
);
console.log('TABELAS PUBLIC:', JSON.stringify(tables));

const db = await prisma.$queryRawUnsafe(`SELECT current_database(), current_schema()`);
console.log('DB ATUAL:', JSON.stringify(db));

const tenants = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "tenants"`);
console.log('TENANTS:', JSON.stringify(tenants));

await prisma.$disconnect();
