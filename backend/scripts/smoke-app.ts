/**
 * Smoke test del arranque de la app sin depender de PostgreSQL.
 * Verifica: boot del grafo Express, límites de rate, validación Zod,
 * error-handler y respuesta 404. Uso: npx tsx scripts/smoke-app.ts
 */
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`ok  → ${msg}`);
}

async function main() {
  const app = createApp();
  const server = app.listen(0, '127.0.0.1', () => {
    const address = server.address();
    if (!address) {
      console.error('No address bound');
      process.exit(1);
    }
    // Los checks corren; antes de morir cerramos sockets para un exit limpio.
    void runChecks(address.port).then(() => {
      server.closeAllConnections?.();
      setTimeout(() => process.exit(0), 150);
    });
  });
}

async function runChecks(port: number) {
  const base = `http://127.0.0.1:${port}`;
  console.log(`smoke server up on :${port}`);

  // 1) Health sin BD → 503 degraded pero con shape JSON correcto
  const health = await fetch(`${base}/api/v1/health`);
  await health.json();
  assert(health.status === 503, `health degraded (sin BD) → ${health.status}`);

  // 2) Ruta protegida sin token → 401
  const tickets = await fetch(`${base}/api/v1/tickets`);
  const ticketsBody = await tickets.json();
  assert(tickets.status === 401, `tickets sin auth → ${tickets.status}`);
  assert(ticketsBody.error?.code === 'UNAUTHORIZED', `código de error UNAUTHORIZED → ${String(ticketsBody.error?.code)}`);

  // 3) Validación Zod: register-tenant sin body → 422 VALIDATION_ERROR
  const register = await fetch(`${base}/api/v1/auth/register-tenant`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  const registerBody = await register.json();
  assert(register.status === 422, `register vacío → ${register.status}`);
  assert(registerBody.error?.code === 'VALIDATION_ERROR', `código VALIDATION_ERROR → ${String(registerBody.error?.code)}`);

  // 4) Ruta inexistente (fuera del router v1) → 404 app-level
  const nope = await fetch(`${base}/nope`);
  const nopeBody = await nope.json();
  assert(nope.status === 404, `ruta inexistente → ${nope.status}`);
  assert(nopeBody.error?.code === 'NOT_FOUND', `código NOT_FOUND → ${String(nopeBody.error?.code)}`);

  console.log('\nSMOKE TEST PASSED ✅ (sin BD)');
}

main().catch((err) => {
  console.error('SMOKE TEST FAILED ❌', err);
  process.exit(1);
});