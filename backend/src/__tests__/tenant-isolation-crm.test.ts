import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app';
import {
  closeTestDatabase,
  createTestCustomer,
  createTestTenant,
  createTestUser,
  issueTestToken,
  type TestCustomer,
  type TestTenant,
  type TestUser,
} from './helpers/test-context';

/**
 * TESTE DE ISOLAMENTO MULTI-TENANT — CRM (Clientes e Deals)
 * Garante que um usuário do Tenant A JAMAIS consegue visualizar ou
 * operar sobre clientes/deals do Tenant B.
 */

let app: Express;
let tenantA: TestTenant;
let tenantB: TestTenant;
let adminA: TestUser;
let adminB: TestUser;
let tokenA: string;
let tokenB: string;
let customerA: TestCustomer;
let customerB: TestCustomer;

beforeAll(async () => {
  app = await createApp();
  tenantA = await createTestTenant('Tenant Alpha');
  tenantB = await createTestTenant('Tenant Beta');
  adminA = await createTestUser(tenantA, { role: 'ADMIN', email: 'admin-alpha@test.local' });
  adminB = await createTestUser(tenantB, { role: 'ADMIN', email: 'admin-beta@test.local' });
  tokenA = issueTestToken(adminA);
  tokenB = issueTestToken(adminB);
  customerA = await createTestCustomer(tenantA, { name: 'Cliente Alpha', company: 'Alpha Inc.' });
  customerB = await createTestCustomer(tenantB, { name: 'Cliente Beta', company: 'Beta Ltd.' });
});

afterAll(async () => {
  await closeTestDatabase();
});

describe('Isolamento Multi-Tenant — Clientes (CRM)', () => {
  it('Tenant A NÃO pode listar clientes do Tenant B', async () => {
    const res = await request(app)
      .get('/api/v1/crm/customers')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-ID', tenantA.id)
      .expect(200);

    const customers = res.body.data.rows as Array<{ id: string; tenantId: string }>;
    expect(customers.find((c) => c.id === customerB.id)).toBeUndefined();
    for (const customer of customers) expect(customer.tenantId).toBe(tenantA.id);
    expect(customers.some((c) => c.id === customerA.id)).toBe(true);
  });

  it('Tenant A NÃO pode visualizar detalhe do cliente do Tenant B (404)', async () => {
    const res = await request(app)
      .get(`/api/v1/crm/customers/${customerB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-ID', tenantA.id)
      .expect(404);
    expect(res.body.error?.code).toBe('NOT_FOUND');
  });

  it('Tenant A NÃO pode atualizar cliente do Tenant B (404)', async () => {
    await request(app)
      .patch(`/api/v1/crm/customers/${customerB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-ID', tenantA.id)
      .send({ name: 'Nome Invadido' })
      .expect(404);
  });

  it('Tenant A NÃO pode deletar cliente do Tenant B (404)', async () => {
    await request(app)
      .delete(`/api/v1/crm/customers/${customerB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-ID', tenantA.id)
      .expect(404);
  });

  it('Tenant A NÃO pode criar deal vinculado a cliente do Tenant B (400)', async () => {
    const res = await request(app)
      .post('/api/v1/crm/deals')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-ID', tenantA.id)
      .send({ customerId: customerB.id, title: 'Deal cross-tenant', value: 1000 })
      .expect(400);
    expect(res.body.error?.code).toBe('CUSTOMER_NOT_FOUND');
  });
});
