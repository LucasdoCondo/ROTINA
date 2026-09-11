import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../../shared/password';
import { signAccessToken } from '../../shared/jwt';
import type { UserRoleValue, UserStatusValue } from '../../domain/constants';
import type { TokenUser } from '../../shared/jwt';

/**
 * Contexto de testes de integração — criação de tenants, usuários,
 * autenticação e seed de dados para testes multi-tenant.
 *
 * Usa o PrismaClient RAIZ (sem extensão de tenant) para setup, já que
 * precisamos criar dados em múltiplos tenants no mesmo teste.
 *
 * O banco de testes (schema rotina_test) deve estar migrado antes:
 *   npm run db:deploy  # ou prisma migrate deploy --schema=prisma/schema.prisma
 * com DATABASE_URL apontando para o schema rotina_test.
 */

const root = new PrismaClient();

export interface TestTenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  plan: string;
  status: string;
  contactEmail: string | null;
}

export interface TestUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRoleValue;
  status: UserStatusValue;
  passwordHash: string;
}

export interface TestCustomer {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  document: string | null;
  status: string;
}

export interface TestTicket {
  id: string;
  tenantId: string;
  number: number;
  protocol: string;
  subject: string;
  description: string;
  priority: string;
  category: string;
  status: string;
  creatorId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Cria um tenant ATIVO diretamente no banco (root client).
 * Cria também uma subscription padrão para o tenant.
 */
export async function createTestTenant(name?: string): Promise<TestTenant> {
  const slug = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tenant = await root.tenant.create({
    data: {
      name: name ?? `Tenant ${slug}`,
      slug,
      domain: `${slug}.test.local`,
      plan: 'FREE',
      status: 'ACTIVE',
      contactEmail: `admin@${slug}.test.local`,
      subscriptions: {
        create: {
          plan: 'FREE',
          status: 'TRIALING',
          currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
        },
      },
    },
  });
  return tenant;
}

/**
 * Cria um usuário em um tenant, com senha padrão, e retorna os tokens JWT.
 * O usuário é criado como ACTIVE para poder autenticar.
 */
export async function createTestUser(
  tenant: TestTenant,
  options?: {
    email?: string;
    name?: string;
    role?: UserRoleValue;
    password?: string;
  },
): Promise<TestUser> {
  const password = options?.password ?? 'Sup3r-S3cret-Test!';
  const passwordHash = await hashPassword(password);
  const email = options?.email ?? `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.local`;

  const user = await root.user.create({
    data: {
      tenantId: tenant.id,
      email,
      name: options?.name ?? 'Test User',
      passwordHash,
      role: options?.role ?? 'MEMBER',
      status: 'ACTIVE',
    },
  });

  return user;
}

/**
 * Gera um access token JWT para um usuário de teste.
 * Espelha o fluxo real de login (mesma secret, claims e TTL).
 */
export function issueTestToken(user: TestUser): string {
  const tokenUser: TokenUser = {
    id: user.id,
    tenantId: user.tenantId,
    role: user.role,
    status: user.status,
  };
  return signAccessToken(tokenUser);
}

/**
 * Cria um customer em um tenant.
 */
export async function createTestCustomer(
  tenant: TestTenant,
  options?: { name?: string; email?: string; company?: string },
): Promise<TestCustomer> {
  const customer = await root.customer.create({
    data: {
      tenantId: tenant.id,
      name: options?.name ?? 'Customer Test',
      email: options?.email ?? `customer-${Date.now()}@test.local`,
      phone: null,
      company: options?.company ?? null,
      document: null,
      status: 'ACTIVE',
    },
  });
  return customer;
}

/**
 * Cria um ticket em um tenant (usando o mecanismo real de criação).
 * Como o ticket tem número sequencial e protocolo, precisamos usar
 * a lógica do serviço ou criar diretamente aqui.
 */
export async function createTestTicket(
  tenant: TestTenant,
  creator: TestUser,
  options?: { subject?: string; description?: string; priority?: string; category?: string },
): Promise<TestTicket> {
  // Busca o último número do tenant para gerar o sequencial
  const last = await root.ticket.findFirst({
    where: { tenantId: tenant.id, deletedAt: null },
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  const number = (last?.number ?? 0) + 1;
  const protocol = `TKT-${new Date().getFullYear()}-${String(number).padStart(6, '0')}`;

  const ticket = await root.ticket.create({
    data: {
      tenantId: tenant.id,
      number,
      protocol,
      subject: options?.subject ?? 'Test Ticket',
      description: options?.description ?? 'Descrição de teste para o ticket',
      priority: (options?.priority ?? 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
      category: (options?.category ?? 'OTHER') as 'BUG' | 'FEATURE' | 'ACCOUNT' | 'ACCESS' | 'PAYMENT' | 'BILLING' | 'QUESTION' | 'OTHER',
      status: 'OPEN',
      creatorId: creator.id,
      updatedById: creator.id,
    },
  });
  return ticket;
}

/** Encerra a conexão do Prisma root (chamado no afterAll). */
export async function closeTestDatabase(): Promise<void> {
  await root.$disconnect();
}

/** Limpa todas as tabelas do schema de teste (use no beforeEach/afterEach). */
export async function clearTestDatabase(): Promise<void> {
  // Ordem respeita FKs → filhos primeiro.
  await root.ticketMessage.deleteMany();
  await root.refreshToken.deleteMany();
  await root.ticket.deleteMany();
  await root.deal.deleteMany();
  await root.customer.deleteMany();
  await root.invitation.deleteMany();
  await root.subscription.deleteMany();
  await root.user.deleteMany();
  await root.tenant.deleteMany();
}

export { root };
