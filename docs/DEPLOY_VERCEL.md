# Deploy — Vercel + Neon + OCI

> Documento **vigente** para o branch `main` (backend TypeScript, `backend/src/app.ts`).
> Substitui o `VERCEL_VARIAVEIS.md` do branch legado `master` (os nomes das
> variáveis mudaram: `JWT_SECRET` → `JWT_ACCESS_SECRET`, `CORS_ORIGIN` →
> `CORS_ORIGINS`, etc.). Para o histórico do deploy legado veja
> [`VERCEL_DEPLOY.md`](./VERCEL_DEPLOY.md) e
> [`HOSTING_STRATEGY.md`](./HOSTING_STRATEGY.md).

## 1. Topologia

| Camada | Onde roda | Como |
| --- | --- | --- |
| SPA (React + Vite) | **Vercel** | `vercel.json` → `@vercel/static-build` sobre `frontend/package.json` → `frontend/dist` |
| API (Express) — opção A (padrão) | **Vercel Functions** | `api/index.ts` (default export da app Express, **sem** `app.listen()`) |
| API (Express) — opção B | **OCI (Docker)** | `docker compose -f docker-compose.prod.yml up -d backend` (compose sem Nginx) |
| Banco (PostgreSQL) | **Neon** | `DATABASE_URL` *pooled* (runtime) + `DIRECT_URL` *direct* (migrations/CLI) |
| Redis (cache + filas) | **OCI** (ou Upstash) | `REDIS_URL` — opcional: sem ele a app degrada em silêncio |
| Workers BullMQ + purga | **OCI** | `docker compose ... up -d worker` → `node dist/worker.js` |
| Purga agendada (alternativa) | **Vercel Cron** | `crons` no `vercel.json` → `GET /api/v1/internal/jobs/purge` |

```text
navegador ──▶ Vercel (SPA + /api/* Function) ──┬──▶ Neon (POOLED)   [queries]
                                               └──▶ (nada de Redis em serverless)
OCI ──▶ backend (opção B) + worker ──▶ Neon (POOLED/ DIRECT p/ migrations) + Redis
```

## 2. Decisões registradas (e o porquê)

1. **Um único projeto na Vercel com `builds` + `routes`.**
   É o mesmo padrão que já roda em produção neste repositório (branch `master`),
   com `@vercel/static-build` para a SPA e `@vercel/node` para a API.
   Em `routes`, o `dest` aponta para o arquivo da Function e **o path original
   chega intacto** ao Express (`/api/v1/...`), que é o que permite reutilizar a
   mesma app do `backend/`. (Com `rewrites` o destino *substitui* o path — por
   isso ele não é usado aqui; ver §4 para o caso de proxy para a OCI.)
2. **npm workspaces na raiz** (`package.json` → `backend`, `frontend`).
   Sem isso a Vercel não tem o que instalar na raiz do monorepo e a Function não
   encontra `express`. O lockfile canônico é o `package-lock.json` da raiz
   (os `package-lock.json` por workspace continuam existindo porque os builds de
   Docker usam contexto `./backend`).
3. **`api/index.ts` não faz bootstrap stateful.** Nada de `app.listen()`, de
   `prisma.$connect()` explícito, de `initRedis()` nem de `startWorkers()`: a
   Vercel congela a instância após o request/response. A flag `IS_SERVERLESS`
   (`backend/src/config/env.ts`) desliga as filas BullMQ nesse ambiente.
4. **Jobs repetitivos fora da Vercel.** A Vercel Cron cobre a purga diária por
   HTTP (endpoint protegido); os workers BullMQ rodam no processo isolado da OCI
   (`backend/src/worker.ts`), porque exigem conexões long-lived.
5. **Frontend usa caminho relativo `…`** (`/api/v1`) quando `VITE_API_URL` não
   está definido em produção: mesma origem ⇒ zero CORS, cookies httpOnly sem
   `SameSite=None`.

## 3. `vercel.json` (campo a campo)

```jsonc
{
  "builds": [
    { "src": "frontend/package.json", "use": "@vercel/static-build",
      "config": { "distDir": "dist" } },          // roda `npm run build` do frontend
    { "src": "api/index.ts", "use": "@vercel/node" } // 1 Function só, para todo /api/*
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "api/index.ts" },  // API primeiro (path preservado)
    { "handle": "filesystem" },                      // assets estáticos do Vite
    { "src": "/(.*)", "dest": "frontend/dist/$1" },
    { "src": "/(.*)", "dest": "frontend/dist/index.html" } // fallback do react-router
  ],
  "crons": [{ "path": "/api/v1/internal/jobs/purge", "schedule": "0 3 * * *" }],
  "env": { "NODE_ENV": "production" }
}
```

> ⚠️ Quando existe `builds` no `vercel.json`, o **Build Command / Output
> Directory do painel são ignorados** — o build é o desta configuração.
> Não use também `rewrites` no mesmo arquivo (a Vercel rejeita misturar
> `routes` com o pipeline novo de roteamento).

### Tipos de cron e limites
- Vercel Cron só existe em **deploy de produção** e dispara **GET**; envia
  `Authorization: Bearer <CRON_SECRET>` quando a env `CRON_SECRET` existe.
- Plano **Hobby**: poucos cron jobs e frequência **diária** (o `0 3 * * *` acima
  respeita isso). Em Pro dá para usar frequências menores.
- A Function do job precisa terminar dentro do `maxDuration` do plano. Purga
  muito grande → rode na OCI (`npm run job:purge`) em vez do cron.

## 4. Alternativa: API na OCI (Vercel só como proxy)

Se o backend continuar rodando no Docker da OCI (opção B), troque o bloco
`routes` do §3 por `rewrites` para a origem externa — nesse caso a Vercel é
apenas borda/CDN e o Express recebe o path já prefixado com `/api`:

```jsonc
{
  "builds": [
    { "src": "frontend/package.json", "use": "@vercel/static-build",
      "config": { "distDir": "dist" } }
  ],
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://api.seu-dominio.com/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Nessa configuração:
- **remova** `api/index.ts` (não há Function) e o `crons` (agende na OCI);
- mantenha `VITE_API_URL` **vazio** se quiser usar o mesmo domínio (proxy) ou
  `https://api.seu-dominio.com/api/v1` para chamar a OCI direto do navegador;
- a OCI precisa de TLS (Load Balancer, Caddy/Traefik) e `CORS_ORIGINS` com o
  domínio da Vercel.

## 5. Variáveis de ambiente

### Vercel → Project → Settings → Environment Variables

| Variável | Ambientes | Valor / observação |
| --- | --- | --- |
| `DATABASE_URL` | Production, Preview, Development | conexão **POOLED** do Neon (`-pooler` + `pgbouncer=true`) |
| `DIRECT_URL` | Production, Preview, Development | conexão **DIRECT** do Neon (sem `-pooler`) — **obrigatória** mesmo em runtime: o schema a referencia e o `postinstall` (`prisma generate`) falha sem ela (P1012) |
| `JWT_ACCESS_SECRET` | todos | ≥ 32 caracteres (`openssl rand -base64 48`) |
| `JWT_ACCESS_TTL` | todos | ex.: `15m` |
| `REFRESH_TOKEN_TTL_DAYS` | todos | ex.: `7` |
| `CORS_ORIGINS` | todos | domínio(s) do SPA separados por vírgula |
| `APP_URL` | todos | URL pública (links de e-mail / webhook) |
| `CRON_SECRET` | Production | ≥ 16 caracteres; a Vercel Cron envia `Authorization: Bearer <valor>` |
| `LOG_LEVEL` | todos | `info` |
| `VITE_API_URL` | Production, Preview | **deixe vazio** para same-origin (`/api/v1`) ou a URL da API na OCI |
| `REDIS_URL` | — | **não defina na Vercel**: as filas BullMQ ficam desabilitadas por design (`IS_SERVERLESS`). Redis vive na OCI/Upstash, usado pelo backend/worker da OCI |
| `ARGON2_*`, `RATE_LIMIT_*`, `TRUST_PROXY` | todos | ver `backend/.env.example` (`TRUST_PROXY=1` quando houver um proxy na frente) |

### Formulários / webhooks de pagamento
`PAYMENT_PROVIDER`, `PAYMENT_WEBHOOK_SECRET`, `PAYMENT_WEBHOOK_URL` — os
webhooks precisam apontar para a URL pública
(`https://<projeto>.vercel.app/api/v1/payments/webhook`).

### CI/CD (GitHub → Settings → Secrets and variables → Actions)
| Secret | Usado por |
| --- | --- |
| `DIRECT_URL` | `.github/workflows/migrations.yml` (conexão direta do Neon) |
| `DATABASE_URL` | `.github/workflows/migrations.yml` (mesma pooled da API) |

## 6. Fluxo de deploy

```bash
# 0. pré-requisitos locais (uma vez)
npm install                 # workspaces: instala backend + frontend e gera o Prisma Client

# 1. validar local (sem Vercel)
npm run typecheck
npm run smoke:serverless    # sobe o adaptador api/index.ts e valida as rotas
cd frontend && npm run build && cd ..

# 2. migrations (nunca no build da Vercel)
#    automático: push em `main` que altere backend/prisma/** → workflow migrations.yml
#    manual:     cd backend && npm run db:deploy

# 3. deploy
git push origin main        # Vercel: static-build (frontend) + @vercel/node (api/index.ts)

# 4. homologação
curl -s https://<projeto>.vercel.app/api/v1/health   # {"data":{"status":"ok","database":"up"}}
```

## 7. Jobs agendados

```bash
# Purga (Vercel Cron → GET)
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  https://<projeto>.vercel.app/api/v1/internal/jobs/purge

# Purga (manual/OCI → POST, header próprio)
curl -s -X POST -H "x-internal-secret: $INTERNAL_CRON_SECRET" \
  https://<projeto>.vercel.app/api/v1/internal/jobs/purge
```

Sem `CRON_SECRET` **e** sem `INTERNAL_CRON_SECRET` o endpoint responde **503**
(proteção contra execução anônima de um hard delete).

## 8. Checklist de homologação

- [ ] `GET /api/v1/health` → 200 com `database: "up"` (Neon pooled).
- [ ] Login/registro funcionando (JWT + cookie httpOnly) no domínio da Vercel.
- [ ] Chamadas do SPA sem erro de CORS (`CORS_ORIGINS` correto).
- [ ] `prisma migrate status` (com `DIRECT_URL`) sem migrations pendentes.
- [ ] Cron visível em **Project → Cron Jobs** e log do job com a purga.
- [ ] Worker da OCI com log `Worker: em execução (workers BullMQ + purga agendada)`.
- [ ] `docker compose --env-file .env.production -f docker-compose.prod.yml ps` (opção B).

## 9. Troubleshooting

| Sintoma | Causa provável / correção |
| --- | --- |
| `P1012: Environment variable not found: DIRECT_URL` | falta `DIRECT_URL` (Vercel, CI ou `backend/.env`). No build do Docker o `ARG DIRECT_URL` já cobre |
| `FUNCTION_INVOCATION_FAILED` em `/api/*` | env faltando (`config/env.ts` valida no cold start) ou `express` não instalado — confirme `workspaces` + `package-lock.json` na raiz |
| `404` em `/api/v1/...` | alguém trocou `routes` por `rewrites`: nesse caso o path da função vira o destino. Volte ao §3 |
| SPA 404 ao dar refresh numa rota interna | falta o fallback `/(.*) → frontend/dist/index.html` no `routes` |
| CORS bloqueado | `CORS_ORIGINS` sem o domínio exato do SPA, ou `VITE_API_URL` apontando para host diferente |
| Cron não dispara | cron só roda em produção; no Hobby a frequência é diária; confira `crons` no `vercel.json` |
| Fila de e-mail não processa | esperado em serverless (`IS_SERVERLESS` desliga BullMQ) — suba o serviço `worker` na OCI |

## 10. Legado (branch `master`) — atenção

O sistema **em produção hoje** (https://rotina-sjlu.vercel.app) é o código do
branch `master` (JavaScript). O branch `main` é a reescrita TypeScript: **não
promova `main` a produção** sem substituir o sistema antigo de forma
consciente. Ao conectar/migrar o projeto na Vercel, confira o *Production
Branch* (Settings → Git) — o procedimento manual do painel está em
[`VERCEL_DEPLOY.md`](./VERCEL_DEPLOY.md).