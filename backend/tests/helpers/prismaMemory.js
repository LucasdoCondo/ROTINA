/**
 * Helper de tests — Fake in-memory de Prisma Client
 *
 * Implementa SOLO las operaciones utilizadas por los servicios bajo prueba,
 * con el filtrado por `where` (incluyendo tenantId) para validar el
 * aislamiento multi-tenant sin tocar una base de datos real.
 *
 * Uso:
 *   jest.mock('../src/config/prisma', () => createPrismaMemory());
 *   const prisma = require('../src/config/prisma');
 *   // Semilla directa:
 *   prisma.store.client.push({ id: 'c-1', tenantId: 't-1', name: 'A' });
 */

const TABLES = [
  'user',
  'tenant',
  'client',
  'product',
  'order',
  'orderItem',
  'ticket',
  'memberSubscription',
  'subscription',
  'auditLog',
  'onlineSession',
  'tenantModule',
  'invite',
  'opportunity',
  'dataDeletionLog',
  'processedWebhook',
];

let seq = 0;

/**
 * Compara un registro contra un where de Prisma (subconjunto de operadores).
 */
function matches(where) {
  if (!where) return () => true;

  return (record) => {
    for (const [key, value] of Object.entries(where)) {
      if (key === 'OR') {
        if (!value.some((cond) => matches(cond)(record))) return false;
        continue;
      }
      if (key === 'AND') {
        if (!value.every((cond) => matches(cond)(record))) return false;
        continue;
      }
      // Claves compuestas (tenantId_email, etc.) no se evalúan en el fake
      if (key.includes('_')) continue;

      if (value && typeof value === 'object' && !(value instanceof Date)) {
        if (value.equals !== undefined) {
          if (record[key] !== value.equals) return false;
        } else if (value.gte !== undefined) {
          if (!(new Date(record[key]) >= new Date(value.gte))) return false;
        } else if (value.lte !== undefined) {
          if (!(new Date(record[key]) <= new Date(value.lte))) return false;
        } else if (value.gt !== undefined) {
          if (!(new Date(record[key]) > new Date(value.gt))) return false;
        } else if (value.lt !== undefined) {
          if (!(new Date(record[key]) < new Date(value.lt))) return false;
        } else if (value.contains !== undefined) {
          if (!String(record[key]).toLowerCase().includes(String(value.contains).toLowerCase())) return false;
        } else if (value.in !== undefined) {
          if (!value.in.includes(record[key])) return false;
        }
        continue;
      }

      if (record[key] !== value) return false;
    }
    return true;
  };
}

/**
 * Construye el objeto Prisma fake.
 */
function createPrismaMemory() {
  const store = {};
  TABLES.forEach((table) => {
    store[table] = [];
  });

  const model = (table) => {
    const findByIdWhere = (where) => {
      const criteria = matches(where);
      return store[table].findIndex((record) => criteria(record));
    };

    return {
      findMany: jest.fn(({ where } = {}) => Promise.resolve(store[table].filter(matches(where)))),
      findFirst: jest.fn(({ where } = {}) => Promise.resolve(store[table].find(matches(where)) || null)),
      findUnique: jest.fn(({ where } = {}) => Promise.resolve(store[table].find(matches(where)) || null)),
      count: jest.fn(({ where } = {}) => Promise.resolve(store[table].filter(matches(where)).length)),
      create: jest.fn(({ data }) => {
        const record = {
          id: `fake-${++seq}`,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
          ...data,
        };
        store[table].push(record);
        return Promise.resolve(record);
      }),
      update: jest.fn(({ where, data }) => {
        const idx = findByIdWhere(where);
        if (idx === -1) throw new Error(`${table} not found`);
        const current = store[table][idx];
        const next = { ...current };
        // Suporta operadores do Prisma: increment / decrement / set
        for (const [key, value] of Object.entries(data)) {
          if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            if (value.increment !== undefined) {
              next[key] = (Number(current[key]) || 0) + value.increment;
              continue;
            }
            if (value.decrement !== undefined) {
              next[key] = (Number(current[key]) || 0) - value.decrement;
              continue;
            }
            if (value.set !== undefined) {
              next[key] = value.set;
              continue;
            }
          }
          next[key] = value;
        }
        store[table][idx] = { ...next, updatedAt: new Date() };
        return Promise.resolve(store[table][idx]);
      }),
      delete: jest.fn(({ where }) => {
        const idx = findByIdWhere(where);
        if (idx === -1) throw new Error(`${table} not found`);
        return Promise.resolve(store[table].splice(idx, 1)[0]);
      }),
      deleteMany: jest.fn(({ where } = {}) => {
        const before = store[table].length;
        store[table] = store[table].filter((record) => !matches(where)(record));
        return Promise.resolve({ count: before - store[table].length });
      }),
      upsert: jest.fn(({ where, update, create }) => {
        const existing = store[table].find(matches(where));
        if (existing) {
          const idx = store[table].indexOf(existing);
          store[table][idx] = { ...existing, ...update, updatedAt: new Date() };
          return Promise.resolve(store[table][idx]);
        }
        const record = { id: `fake-${++seq}`, createdAt: new Date(), updatedAt: new Date(), ...create };
        store[table].push(record);
        return Promise.resolve(record);
      }),
    };
  };

  const ops = {};
  TABLES.forEach((table) => {
    ops[table] = model(table);
  });

  return {
    ...ops,
    store,
    $transaction: jest.fn(async (callback) => callback(ops)),
    $connect: jest.fn(async () => true),
    $disconnect: jest.fn(async () => true),
    $queryRaw: jest.fn(async () => [{ '?column?': 1 }]),
    $use: jest.fn(),
    $on: jest.fn(),
  };
}

module.exports = { createPrismaMemory, matches };