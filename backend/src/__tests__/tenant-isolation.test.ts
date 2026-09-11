import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app';
import {
  closeTestDatabase,
  createTestCustomer,
  createTestTenant,
  createTestTicket,
  createTestUser,
  issueTestToken,
  type TestCustomer,
  type TestTenant,
  type TestTicket,
  type TestUser,
} from './helpers/test-context';

/**
 * TESTES DE ISOLAMENTO MULTI-TENANT
 * Garantem que um usuário do Tenant A JAMAIS consegue visualizar ou
 * operar sobre dados (chamados/clientes) do Tenant B.
 * Roda contra schema rotina_test (DATABASE_URL com schema=rotina_test).
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
let ticketA: TestTicket;
let ticketB: TestTicket;

beforeAll(async () => {
  app = await createApp();
  tenantA = await createTestTenant('Tenant Alpha');
  tenantB = await createTestTenant('Tenant Beta');
  adminA = await createTestUser(tenantA, { role: 'ADMIN', email: 'admin-alpha@test.local' });
  adminB = await createTestUser(tenantB, { role: 'ADMIN', email: 'admin-beta@test.local' });
  tokenA = issueTestToken(adminA);
  tokenB = issueTestToken(adminB);
  customerA = await createTestCustomer(tenantA, { name: 'Cliente Alpha' });
  customerB = await createTestCustomer(tenantB, { name: 'Cliente Beta' });
  ticketA = await createTestTicket(tenantA, adminA, { subject: 'Problema Alpha' });
  ticketB = await createTestTicket(tenantB, adminB, { subject: 'Problema Beta' });
});

afterAll(async () => {
  await closeTestDatabase();
});

describe('Isolamento Multi-Tenant — Chamados (Tickets)', () => {
  it('Tenant A NÃO pode listar chamados do Tenant B', async () => {
    const res = await request(app)
      .get('/api/v1/tickets')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-ID', tenantA.id)
      .expect(200);
    const tickets = res.body.data.rows as Array<{ id: string; tenantId: string }>;
    expect(tickets.find((t) => t.id === ticketB.id)).toBeUndefined();
    for (const ticket of tickets) expect(ticket.tenantId).toBe(tenantA.id);
    expect(tickets.some((t) => t.id === ticketA.id)).toBe(true);
  });

  it('Tenant A NÃO pode visualizar detalhe do ticket do Tenant B (404)', async () => {
    const res = await request(app)
      .get(`/api/v1/tickets/${ticketB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-ID', tenantA.id)
      .expect(404);
    expect(res.body.error?.code).toBe('NOT_FOUND');
  });

  it('Tenant A NÃO pode adicionar mensagem no ticket do Tenant B (404)', async () => {
    await request(app)
      .post(`/api/v1/tickets/${ticketB.id}/messages`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-ID', tenantA.id)
      .send({ body: 'Tentativa cross-tenant' })
      .expect(404);
  });

  it('Tenant A NÃO pode alterar status do ticket do Tenant B (404)', async () => {
    await request(app)
      .patch(`/api/v1/tickets/${ticketB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-ID', tenantA.id)
      .send({ status: 'IN_PROGRESS' })
      .expect(404);
  });

  it('Tenant A NÃO pode deletar ticket do Tenant B (404)', async () => {
    await request(app)
      .delete(`/api/v1/tickets/${ticketB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-ID', tenantA.id)
      .expect(404);
  });

  it('Token do Tenant B vazado no header NÃO muda o escopo (JWT tem precedência)', async () => {
    const res = await request(app)
      .get('/api/v1/tickets')
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Tenant-ID', tenantA.id)
      .expect(200);
    const tickets = res.body.data.rows as Array<{ id: string; tenantId: string }>;
    for (const ticket of tickets) expect(ticket.tenantId).toBe(tenantB.id);
    expect(tickets.some((t) => t.id === ticketA.id)).toBe(false);
  });
});
