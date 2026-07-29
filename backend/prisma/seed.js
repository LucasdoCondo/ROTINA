const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Criar tenant padrão
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'empresa-padrao' },
    update: {},
    create: {
      name: 'Empresa Padrão',
      slug: 'empresa-padrao',
      email: 'admin@empresa.com',
      cnpj: '00.000.000/0001-00',
      plan: 'pro',
      active: true,
    },
  });

  console.log(`✅ Tenant criado: ${tenant.name}`);

  // Criar usuário admin
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'admin@empresa.com',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@empresa.com',
      name: 'Administrador',
      password: hashedPassword,
      role: 'ADMIN',
      emailVerified: true,
      active: true,
    },
  });

  console.log(`✅ Admin criado: ${admin.email}`);

  // Criar módulos padrão
  const modulos = ['dashboard', 'chamados', 'crm', 'ecommerce', 'relatorios'];
  
  for (const modulo of modulos) {
    await prisma.tenantModule.upsert({
      where: {
        tenantId_module: {
          tenantId: tenant.id,
          module: modulo,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        module: modulo,
        active: true,
      },
    });
  }

  console.log(`✅ ${modulos.length} módulos ativados`);

  // Criar assinatura
  await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      status: 'ACTIVE',
      planId: 'pro',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
    },
  });

  console.log('✅ Assinatura criada');

  // Criar dados de exemplo
  const clientes = [
    { name: 'João Silva', email: 'joao@email.com', phone: '(11) 99999-0001' },
    { name: 'Maria Santos', email: 'maria@email.com', phone: '(11) 99999-0002' },
    { name: 'Pedro Oliveira', email: 'pedro@email.com', phone: '(11) 99999-0003' },
  ];

  for (const cliente of clientes) {
    await prisma.client.create({
      data: {
        ...cliente,
        tenantId: tenant.id,
        status: 'active',
      },
    });
  }

  console.log(`✅ ${clientes.length} clientes criados`);

  // Criar produtos de exemplo
  const produtos = [
    { name: 'Notebook Pro', price: 4999.99, stock: 10 },
    { name: 'Mouse Wireless', price: 89.90, stock: 50 },
    { name: 'Teclado Mecânico', price: 299.99, stock: 30 },
    { name: 'Monitor 27"', price: 1999.99, stock: 15 },
    { name: 'Webcam HD', price: 199.90, stock: 25 },
  ];

  for (const produto of produtos) {
    await prisma.product.create({
      data: {
        ...produto,
        tenantId: tenant.id,
        active: true,
      },
    });
  }

  console.log(`✅ ${produtos.length} produtos criados`);

  // Criar chamados de exemplo
  const chamados = [
    { title: 'Problema com login', description: 'Não consigo acessar o sistema', priority: 'high', status: 'open' },
    { title: 'Dúvida sobre relatórios', description: 'Como gerar relatório mensal?', priority: 'medium', status: 'in_progress' },
    { title: 'Sugestão de melhoria', description: 'Adicionar filtro por data', priority: 'low', status: 'open' },
  ];

  for (const chamado of chamados) {
    await prisma.ticket.create({
      data: {
        ...chamado,
        tenantId: tenant.id,
        userId: admin.id,
      },
    });
  }

  console.log(`✅ ${chamados.length} chamados criados`);

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('\n📧 Login: admin@empresa.com');
  console.log('🔑 Senha: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });