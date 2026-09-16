/**
 * ─────────────────────────────────────────────────────────────
 *  ROTINA — Adaptador Serverless da API (Vercel Functions)
 * ─────────────────────────────────────────────────────────────
 *
 *  O que faz: expõe a MESMA app Express do backend (backend/src/app.ts →
 *  createApp()) como Function da Vercel, com **default export** — exatamente
 *  o contrato pedido pelo runtime (@vercel/node).
 *
 *  O que NÃO faz (de propósito):
 *   • Não chama `app.listen()` — o socket é gerenciado pela Vercel.
 *   • Não faz bootstrap stateful: sem `prisma.$connect()` explícito, sem
 *     `initRedis()` e sem workers BullMQ. Isso vive em:
 *       - backend/src/server.ts → container da OCI (API long-lived)
 *       - backend/src/worker.ts → workers/purga (processo isolado na OCI)
 *     A Vercel congela a instância após o request/response; conexões
 *     long-lived (BullMQ) e timers não sobrevivem (ver IS_SERVERLESS).
 *
 *  Roteamento: vercel.json → `routes: [{ "src": "/api/(.*)",
 *  "dest": "api/index.ts" }]` (mesmo padrão do deploy legado que já roda em
 *  produção neste repositório; o path original chega intacto ao Express,
 *  que monta o router em /api/v1).
 *
 *  Jobs agendados na Vercel: `crons` no vercel.json chamando
 *  GET /api/v1/internal/jobs/purge (protegido por CRON_SECRET).
 */
import { createApp } from '../backend/src/app.js';

// Instanciada UMA vez por instância (cold start) — reaproveitada nas
// invocações "quentes". O import de config/env.ts valida as env vars
// (fail-fast: uma env faltando derruba a function na hora, com log claro).
const app = createApp();

export default app;