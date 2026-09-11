import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/shared/password.js';

/**
 * Seed de desarrollo: crea un tenant demo (`acme`) con roles ADMIN, AGENT y
 * MEMBER, tickets de ejemplo y datos de CRM (customer + deal). Idempotente
 * (upsert por slug/email/findFirst) para poder ejecutarse repetidamente.
 *
 * Uso: npm run db:seed
 */

const prisma = new PrismaClient();

const DEV_PASSWORD = 'Sup3r-S3cret-Dev!';

async function upsertUser(tenantId: string, email: string, name: string, role: 'ADMIN' | 'AGENT' | 'MEMBER') {
  const existing = await prisma.user.findFirst({
    where: { tenantId, email },
  });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { name, role, status: 'ACTIVE' },
    });
  }
  const passwordHash = await hashPassword(DEV_PASSWORD);
  return prisma.user.create({
    data: { tenantId, email, name, role, status: 'ACTIVE', passwordHash },
  });
}

/** Protocolo idêntico ao gerado pelo serviço: TKT-<ano>-<número 6 dígitos>. */
function buildProtocol(year: number, number: number): string {
  return `TKT-${year}-${String(number).padStart(6, '0')}`;
}

async function upsertTicket(tenantId: string, creatorId: string, number: number, subject: string, description: string, seed: {
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  category?: 'BUG' | 'FEATURE' | 'QUESTION';
}) {
  const existing = await prisma.ticket.findFirst({
    where: { tenantId, number },
  });
  if (existing) return existing;
  return prisma.ticket.create({
    data: {
      tenantId,
      number,
      protocol: buildProtocol(new Date().getFullYear(), number),
      subject,
      description,
      status: seed.status ?? 'OPEN',
      priority: seed.priority ?? 'MEDIUM',
      category: seed.category ?? 'QUESTION',
      creatorId,
      updatedById: creatorId,
    },
  });
}

// ---------- CRM (customer + deal de ejemplo) ----------

async function upsertCustomer(
  tenantId: string,
  ownerId: string,
  email: string,
  data: { name: string; company: string; phone: string; status: 'PROSPECT' | 'ACTIVE'; notes: string },
) {
  const existing = await prisma.customer.findFirst({
    where: { tenantId, email },
  });
  if (existing) return existing;
  return prisma.customer.create({
    data: { tenantId, ownerId, email, ...data },
  });
}

async function upsertDeal(
  tenantId: string,
  customerId: string,
  ownerId: string,
  title: string,
  data: { value: number; currency: string; stage: 'LEAD' | 'NEGOTIATION' | 'WON'; probability: number | null },
) {
  const existing = await prisma.deal.findFirst({
    where: { tenantId, title },
  });
  if (existing) return existing;
  const closedAt = data.stage === 'WON' ? new Date() : null;
  return prisma.deal.create({
    data: {
      tenantId,
      customerId,
      ownerId,
      title,
      value: data.value,
      currency: data.currency,
      stage: data.stage,
      probability: data.probability,
      closedAt,
    },
  });
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'acme' },
    update: { status: 'ACTIVE', plan: 'PROFESSIONAL' },
    create: {
      name: 'Acme Inc.',
      slug: 'acme',
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
      contactEmail: 'hi@acme.io',
    },
  });

  const admin = await upsertUser(tenant.id, 'admin@acme.io', 'Ana Admin', 'ADMIN');
  const agent = await upsertUser(tenant.id, 'agent@acme.io', 'Paco Agente', 'AGENT');
  const member = await upsertUser(tenant.id, 'member@acme.io', 'Mona Member', 'MEMBER');

  await upsertTicket(tenant.id, member.id, 1, 'No puedo iniciar sesión', 'Recibo el error "credenciales inválidas" aunque estoy seguro de la contraseña.', { status: 'IN_PROGRESS', priority: 'HIGH', category: 'BUG' });
  await upsertTicket(tenant.id, member.id, 2, 'Quisiera una función de exportación CSV', 'Necesito exportar el listado de clientes a CSV para reportes mensuales.', { status: 'OPEN', priority: 'LOW', category: 'FEATURE' });
  await upsertTicket(tenant.id, admin.id, 3, 'Duda sobre facturación', '¿El plan Professional incluye más de 10 agentes?', { status: 'RESOLVED', priority: 'MEDIUM', category: 'QUESTION' });

  // CRM demo: cliente ativo + negócios em estágios distintos do funil.
  const customer = await upsertCustomer(
    tenant.id,
    agent.id,
    'contato@cliente-demo.com.br',
    {
      name: 'Cliente Demo Ltda.',
      company: 'Cliente Demo Ltda.',
      phone: '+55 11 98888-7777',
      status: 'ACTIVE',
      notes: 'Conta de demonstração criada pelo seed.',
    },
  );

  await upsertDeal(tenant.id, customer.id, agent.id, 'Implementação — Cliente Demo', {
    value: 15_000,
    currency: 'BRL',
    stage: 'NEGOTIATION',
    probability: 60,
  });
  await upsertDeal(tenant.id, customer.id, admin.id, 'Licenças anuais — Cliente Demo', {
    value: 42_000,
    currency: 'BRL',
    stage: 'WON',
    probability: null,
  });

  void agent;
  console.log(`Seed OK → tenant "${tenant.slug}" (${tenant.id})`);
  console.log(`Usuarios: ${[admin.email, agent.email, member.email].join(', ')}`);
  console.log(`CRM: customer ${customer.email} + 2 deals (NEGOTIATION, WON)`);
  console.log(`Contraseña de prueba: ${DEV_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error('Seed falló:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });