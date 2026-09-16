#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────
 *  ROTINA — Cria conta de testes no banco de PRODUÇÃO (Neon)
 *
 *  Sistema: https://rotina-sjlu.vercel.app/login (branch `master`)
 *
 *  Uso:
 *    set DATABASE_URL=postgresql://...neon...&sslmode=require
 *    node criar-conta-teste.js
 *
 *  Ou passando direto:
 *    node criar-conta-teste.js "postgresql://usuario:senha@host/db?sslmode=require"
 *
 *  Por que direto no banco?
 *    - POST /auth/registrar exige e-mail em formato válido e senha
 *      com no mínimo 6 caracteres → "Admin"/"Admin" seria rejeitado.
 *    - O login (POST /auth/login) NÃO valida formato: apenas compara
 *      o e-mail (case-sensitive, findFirst exato) e o hash bcrypt.
 *    - Porém o formulário web usa <input type="email" required>,
 *      então o navegador exige um "@" no campo. Por isso o padrão
 *      deste script é "Admin@admin.com" (aceito pelo browser).
 * ─────────────────────────────────────────────────────────────
 */

const { Client } = require('pg');
const argon2 = require('argon2');

// ── Configuração (pode sobrescrever via CLI) ─────────────────
const argUrl = process.argv[2];
const DATABASE_URL = argUrl || process.env.DATABASE_URL;

const EMAIL = process.argv[3] || 'Admin@admin.com'; // exatamente como será digitado no login
const SENHA = process.argv[4] || 'Admin';
const NOME = process.argv[5] || 'Administrador Teste';

if (!DATABASE_URL) {
  console.error('✗ Informe DATABASE_URL (argumento 1 ou variável de ambiente).');
  console.error('  Ex.: node criar-conta-teste.js "postgresql://user:pass@host/db?sslmode=require"');
  process.exit(1);
}

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Neon exige SSL
  });
  await client.connect();
  console.log('✓ Conectado ao banco.');

  // 1) Tenant: usa o primeiro tenant ativo; se não existir, cria um.
  let tenant = (
    await client.query(
      `SELECT id, name, slug FROM tenants
       WHERE status IN ('TRIAL', 'ACTIVE') AND deleted_at IS NULL
       ORDER BY created_at ASC LIMIT 1`,
    )
  ).rows[0];

  if (!tenant) {
    tenant = (
      await client.query(
        `INSERT INTO tenants (id, name, slug, plan, status, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, 'PROFESSIONAL', 'ACTIVE', now(), now())
         RETURNING id, name, slug`,
        ['Empresa Teste', 'empresa-teste'],
      )
    ).rows[0];
    console.log(`✓ Tenant criado: ${tenant.name} (${tenant.slug})`);
  } else {
    console.log(`✓ Tenant existente: ${tenant.name} (${tenant.slug})`);
  }

  // 2) Usuário: busca exata (login é case-sensitive: findFirst({ where: { email } }))
  const existente = (
    await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [EMAIL])
  ).rows[0];

  const senhaHash = await argon2.hash(SENHA, {
    type: argon2.argon2id,
    memoryCost: Number(process.env.ARGON2_MEMORY_KB || 19456),
    timeCost: Number(process.env.ARGON2_TIME_COST || 2),
    parallelism: Number(process.env.ARGON2_PARALLELISM || 1),
  });

  if (existente) {
    await client.query(
      `UPDATE users
         SET password_hash = $2, role = 'ADMIN', status = 'ACTIVE', updated_at = now()
       WHERE id = $1`,
      [existente.id, senhaHash],
    );
    console.log(`✓ Senha/role atualizadas para o usuário existente ${EMAIL}`);
  } else {
    await client.query(
      `INSERT INTO users
         (id, tenant_id, email, name, password_hash, role, status, created_at, updated_at)
       VALUES
         (gen_random_uuid(), $1, $2, $3, $4, 'ADMIN', 'ACTIVE', now(), now())`,
      [tenant.id, EMAIL, NOME, senhaHash],
    );
    console.log(`✓ Usuário criado: ${EMAIL}`);
  }

  console.log('\n──────────────────────────────────────────────');
  console.log('  CREDENCIAIS DE TESTE');
  console.log(`  URL   : https://rotina-sjlu.vercel.app/login`);
  console.log(`  E-mail: ${EMAIL}`);
  console.log(`  Senha : ${SENHA}`);
  console.log('──────────────────────────────────────────────');
  console.log('⚠ Obs.: o e-mail precisa ser digitado EXATAMENTE igual (maiúsculas/minúsculas).');
  console.log('⚠ Obs.: o backend em https://rotina-sjlu.vercel.app/api estava retornando');
  console.log('   HTTP 500 (FUNCTION_INVOCATION_FAILED) durante a criação deste script.');
  console.log('   Se o login falhar, verifique os logs na Vercel (funções /api) e a');
  console.log('   variáveis DATABASE_URL/JWT_ACCESS_SECRET no painel do projeto.');

  await client.end();
}

main().catch((err) => {
  console.error('✗ Falhou:', err.message);
  process.exit(1);
});
