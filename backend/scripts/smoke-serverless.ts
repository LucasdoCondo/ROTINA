#!/usr/bin/env tsx
/**
 * ────────────────────────────────────────────────────────────
 *  ROTINA — Smoke test do ADAPTADOR SERVERLESS (api/index.ts)
 * ─────────────────────────────────────────────────────────────
 *
 *  Simula a invocação da Vercel sem depender de PostgreSQL:
 *  cria um servidor HTTP cru com o handler exportado (é exatamente o que o
 *  runtime da Vercel faz: `http.createServer(handler)`), sem `app.listen()`.
 *
 *  Verifica:
 *   1. o default export é uma função (contrato @vercel/node);
 *   2. GET /api/v1/health responde com o envelope JSON (200 up | 503 down);
 *   3. /api/v1/internal/jobs/purge SEM segredo → NUNCA executa (401/503);
 *   4. POST /api/v1/auth/register-tenant {} → 422 VALIDATION_ERROR;
 *   5. GET /nope → 404 NOT_FOUND.
 *
 *  Uso: npm run smoke:serverless   (dentro de backend/)
 * ─────────────────────────────────────────────────────────────
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import * as apiModule from '../../api/index.js';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

/**
 * Normaliza o handler exportado por `api/index.ts`.
 *
 * O diretório `api/` não tem `package.json` próprio, então o arquivo é avaliado
 * como CJS pelo tsx/esbuild: um `export default app` chega aqui como
 * `module.exports = { default: app }`. O runtime da Vercel (@vercel/node) faz
 * esse unwrap no pipeline dela — aqui replicamos apenas para conseguir testar.
 */
function resolveHandler(mod: unknown): Handler {
  let atual: unknown = mod;
  for (let i = 0; i < 3; i += 1) {
    if (typeof atual === 'function') return atual as Handler;
    if (atual !== null && typeof atual === 'object' && 'default' in atual) {
      atual = (atual as { default: unknown }).default;
      continue;
    }
    break;
  }
  throw new Error('api/index.ts não exportou um handler utilizável (default export)');
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`ok  → ${msg}`);
}

async function main(): Promise<void> {
  const handler = resolveHandler(apiModule);
  assert(typeof handler === 'function', 'adaptador exporta um handler padrão (função)');

  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Não foi possível obter a porta do servidor de teste');
  }
  const base = `http://127.0.0.1:${address.port}`;
  console.log(`adapter server up on :${address.port}`);

  try {
    // 1) Health — a rota chama o banco: 200 quando o Neon responde,
    //    503 quando não há conexão. O importante aqui é o contrato JSON.
    const health = await fetch(`${base}/api/v1/health`);
    const healthBody = (await health.json()) as {
      data?: { database?: string; status?: string };
    };
    assert(
      health.status === 200 || health.status === 503,
      `health responde 200/503 → ${health.status}`,
    );
    assert(
      typeof healthBody.data?.database === 'string',
      `envelope de health com data.database → ${String(healthBody.data?.database)}`,
    );

    // 2) Job interno sem segredo: jamais executa (401 sem segredo válido,
    //    503 quando nenhum segredo está configurado no ambiente).
    const purge = await fetch(`${base}/api/v1/internal/jobs/purge`, { method: 'POST' });
    assert(
      purge.status === 401 || purge.status === 503,
      `purge sem segredo não executa → ${purge.status}`,
    );

    // 3) Validação Zod na rota pública de registro.
    const register = await fetch(`${base}/api/v1/auth/register-tenant`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const registerBody = (await register.json()) as { error?: { code?: string } };
    assert(register.status === 422, `register vazio → ${register.status}`);
    assert(
      registerBody.error?.code === 'VALIDATION_ERROR',
      `código VALIDATION_ERROR → ${String(registerBody.error?.code)}`,
    );

    // 4) 404 do app (rota não registrada).
    const nope = await fetch(`${base}/nope`);
    const nopeBody = (await nope.json()) as { error?: { code?: string } };
    assert(nope.status === 404, `rota inexistente → ${nope.status}`);
    assert(
      nopeBody.error?.code === 'NOT_FOUND',
      `código NOT_FOUND → ${String(nopeBody.error?.code)}`,
    );

    console.log('\nSMOKE SERVERLESS PASSED ✅ (sem depender de BD)');
  } finally {
    server.closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

main().catch((err: unknown) => {
  console.error('SMOKE SERVERLESS FAILED ❌', err);
  process.exit(1);
});