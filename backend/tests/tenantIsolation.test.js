/**
 * Testes de ISOLAMENTO multi-tenant (núcleo de segurança del SaaS).
 *
 * Verifica que las consultas SIEMPRE se escopan por el tenantId derivado
 * del token JWT (req.tenantId), nunca del body/query/params enviado por
 * el cliente.
 *
 * Se usa una app Express real con las rutas reales, pero:
 *  - prisma → fake in-memory (sin base de datos)
 *  - auth  → middleware simulado que inyecta req.tenantId desde un header
 *            (equivale a un JWT emitido para ese tenant)
 */

jest.mock('../src/middleware/auth', () => {
  const { ROLES } = require('../src/middleware/rbac');
  return {
    authenticateToken: (req, _res, next) => {
      // Simula la verificación del JWT: el tenantId sale del token, no del body
      req.tenantId = req.headers['x-tenant-id'] || 'tenant-a';
      req.user = {
        id: 'user-1',
        nome: 'Admin Test',
        email: 'admin@test.com',
        cargo: req.headers['x-role'] || ROLES.ADMIN,
      };
      req.userOnlineId = 'sess-1';
      next();
    },
    authorize: () => (req, _res, next) => next(),
    isAdmin: (req, res, next) =>
      req.user.cargo === 'ADMIN' ? next() : res.status(403).json({ message: 'Forbidden' }),
    validateTenant: (req, _res, next) => next(),
    validateSubscription: (req, _res, next) => next(),
    validateModule: () => (req, _res, next) => next(),
  };
});

jest.mock('../src/config/prisma', () => {
  const { createPrismaMemory } = require('./helpers/prismaMemory');
  return createPrismaMemory();
});

const express = require('express');
const request = require('supertest');
const prisma = require('../src/config/prisma');

// Cargar rutas reales (usan los mocks de arriba)
const clientesRoutes = require('../src/routes/clientes');
const usuariosRoutes = require('../src/routes/usuarios');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/clientes', clientesRoutes);
  app.use('/api/usuarios', usuariosRoutes);
  return app;
}

describe('Aislamiento multi-tenant', () => {
  const app = buildApp();

  beforeEach(() => {
    // Limpiar el store in-memory
    Object.values(prisma.store).forEach((rows) => rows.length = 0);
  });

  test('GET /api/clientes solo devuelve clientes del tenant autenticado', async () => {
    prisma.store.client.push({
      id: 'c-a1', tenantId: 'tenant-a', name: 'Cliente A', email: 'a@a.com',
      phone: null, address: null, status: 'active', origin: null, firstPurchaseDate: null,
      createdAt: new Date(), updatedAt: new Date(), _count: { orders: 0 },
    });
    prisma.store.client.push({
      id: 'c-b1', tenantId: 'tenant-b', name: 'Cliente B', email: 'b@b.com',
      phone: null, address: null, status: 'active', origin: null, firstPurchaseDate: null,
      createdAt: new Date(), updatedAt: new Date(), _count: { orders: 0 },
    });

    const res = await request(app)
      .get('/api/clientes')
      .set('x-tenant-id', 'tenant-a');

    expect(res.statusCode).toBe(200);
    expect(res.body.clientes.length).toBe(1);
    expect(res.body.clientes[0].nome).toBe('Cliente A');
  });

  test('POST /api/clientes ignora tenantId del body (usa req.tenantId)', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .set('x-tenant-id', 'tenant-a')
      .send({
        nome: 'Cliente X',
        email: 'x@x.com',
        tenant_id: 'tenant-b', // intento de "tenant hopping"
        tenantId: 'tenant-b',
      });

    expect(res.statusCode).toBe(201);

    const created = prisma.store.client.find((c) => c.name === 'Cliente X');
    expect(created).toBeTruthy();
    expect(created.tenantId).toBe('tenant-a'); // NUNCA tenant-b
  });

  test('PUT /api/clientes/:id NO permite editar cliente de outro tenant', async () => {
    prisma.store.client.push({
      id: 'c-b1', tenantId: 'tenant-b', name: 'Cliente B', email: 'b@b.com',
      phone: null, address: null, status: 'active', origin: null, firstPurchaseDate: null,
      createdAt: new Date(), updatedAt: new Date(), _count: { orders: 0 },
    });

    const res = await request(app)
      .put('/api/clientes/c-b1')
      .set('x-tenant-id', 'tenant-a')
      .send({ nome: 'HACKED' });

    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe('CLIENT_NOT_FOUND');
  });

  test('DELETE /api/clientes/:id NO permite borrar cliente de outro tenant', async () => {
    prisma.store.client.push({
      id: 'c-b1', tenantId: 'tenant-b', name: 'Cliente B', email: 'b@b.com',
      phone: null, address: null, status: 'active', origin: null, firstPurchaseDate: null,
      createdAt: new Date(), updatedAt: new Date(), _count: { orders: 0 },
    });

    const res = await request(app)
      .delete('/api/clientes/c-b1')
      .set('x-tenant-id', 'tenant-a');

    expect(res.statusCode).toBe(404);

    // El registro sigue existiendo (pertenece a tenant-b)
    expect(prisma.store.client.some((c) => c.id === 'c-b1')).toBe(true);
  });

  test('GET /api/usuarios/:id de outro tenant devuelve 404 (no 401/403)', async () => {
    prisma.store.user.push({
      id: 'u-b1', tenantId: 'tenant-b', email: 'user-b@b.com', name: 'User B',
      role: 'MEMBER', active: true, lastLogin: null,
      createdAt: new Date(), updatedAt: new Date(),
    });

    const res = await request(app)
      .get('/api/usuarios/u-b1')
      .set('x-tenant-id', 'tenant-a');

    expect(res.statusCode).toBe(404);
    expect(res.body.code).toBe('USER_NOT_FOUND');
  });
});