# Deploy no Vercel — ROTINA

> ⚠️ **Documento do branch `master` (sistema JS ativo em produção).** Traz o passo a
> passo operacional do painel da Vercel (Production Branch, Build Command, CLI,
> armadilhas conhecidas) — continua válido como referência de operação.
> Para o branch `main` (TypeScript) use [`DEPLOY_VERCEL.md`](./DEPLOY_VERCEL.md);
> os nomes de variáveis lá são diferentes (`JWT_ACCESS_SECRET`, `CORS_ORIGINS`…).

Este documento contém **apenas o que você precisa fazer manualmente**. Os arquivos do projeto já foram ajustados.

---

## 🚀 Fluxo de deploy recomendado (atualizado)

> **Resumo:** Production Branch = **`master`**. O build é controlado pelo `vercel.json` (config `builds`) — o Build Command do painel é **ignorado** quando existe `builds` no `vercel.json`. Migrations **nunca** entram no build da Vercel: use o workflow `migrations.yml` (GitHub Actions) ou rode `prisma migrate deploy` manualmente.

### 1. Deploy automático (recomendado)

```bash
git checkout master
# ...suas mudanças...
git push origin master          # → build + promoção automática a produção
```

O que a Vercel executa (definido no `vercel.json`):

| Bloco `builds` | O que roda | Resultado |
|---|---|---|
| `frontend/package.json` → `@vercel/static-build` | `npm run build` (vite build) | `frontend/dist` servido como SPA |
| `backend/src/server.js` → `@vercel/node` | `postinstall`: `prisma generate` | `/api/*` como serverless function |

Rotas: `/api/(.*)` → `backend/src/server.js`; todo o resto → SPA (`frontend/dist`).

### 2. Deploy manual (hotfix)

```powershell
cd <checkout-do-master>
vercel deploy --prod
```

### 3. Migrations do banco (Neon)

- **Automático:** o workflow `.github/workflows/migrations.yml` roda `prisma migrate deploy` a cada push no `master` que alterar `backend/prisma/migrations/**` (requer o secret `DATABASE_URL` no repositório — Settings → Secrets and variables → Actions; use a conexão **direta** do Neon, sem `-pooler`).
- **Manual:** `npx -y prisma@6 migrate deploy --schema=backend/prisma/schema.prisma` com `DATABASE_URL` do Neon na sessão.

### 4. Armadilhas conhecidas

- ⚠️ O Build Command do painel chegou a ficar com o typo **`npm ruin build`** — isso quebrava todos os deploys do branch `main` (que não tem `vercel.json`). Com Production Branch = `master` isso não afeta os deploys, mas corrigir/limpar o campo evita sustos futuros.
- ⚠️ O branch `main` deste repositório é uma **reescrita diferente** (TypeScript/multi-tenant). Não promova `main` a produção sem querer substituir o sistema atual.

### 5. Production Branch — como alterar (descoberta 15/09/2026)

No painel atual da Vercel, a opção **"Production Branch" não aparece mais na aba Git** da página de settings (a aba agora cobre apenas: repositório conectado, Git LFS, Deploy Hooks e Verified Commits). A API REST pública também não permite alterá-la:

- `PATCH /v9/projects/{id}` → rejeita o campo `link` (`should NOT have additional property 'link'`);
- `POST /v9/projects/{id}/link` → reconecta, mas **ignora** `productionBranch` no body (assume o branch padrão do repositório).

**Como trocar de verdade (via painel):**

1. *Settings → Git* → **Disconnect** no repositório conectado;
2. *Settings → Git* → **Connect Git Repository** → selecione `LucasdoCondo/ROTINA`;
3. No modal de conexão, escolha o **Production Branch = `master`**;
4. Confirme e dispare um push no `master` para validar (deve gerar deploy de *Production*).

**Alternativa enquanto o branch de produção permanecer em `main`:** deploy manual de produção via CLI a partir de um checkout do `master`:

```powershell
git push origin master                 # gera deploy de Preview
vercel deploy --prod                   # promove a produção (a partir do worktree/checkout do master)
```

> ℹ️ Em 15/09/2026 o branch padrão do repositório GitHub foi alterado para `master` (era `main`), refletindo que o sistema ativo é o código do `master`. Se a Vercel passar a respeitar o branch padrão em novas conexões, o passo 3 acima já virá correto.

---

## ✅ Ajustes já realizados no código

- Removido `prisma migrate deploy` do build (não funciona no Vercel)
- Adicionado `postinstall` no backend para gerar o Prisma Client automaticamente
- Configuração do `vercel.json` já está pronta

---

## 📋 Passos manuais para deploy

### 1. Fazer commit e push para o GitHub

```bash
git add .
git commit -m "chore: ajusta config para deploy no Vercel"
git push
```

### 2. Importar projeto na Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **Add New Project**
3. Selecione o repositório `ROTINA`
4. Clique em **Import**

### 2.1 Configurar Root Directory (IMPORTANTE para monorepo)

Antes de fazer o deploy:

1. No painel do projeto, vá em **Settings → General**
2. Procure por **Root Directory**
3. Defina como `/` (raiz do projeto)
4. Salve

⚠️ **Não defina como `/frontend`** pois o backend também precisa ser buildado.

### 3. Configurar variáveis de ambiente

Na Vercel, vá em **Settings → Environment Variables** e adicione para **Production**:

```
NODE_ENV=production
PORT=3001

# Database (Neon - produção)
DATABASE_URL=postgresql://usuario:senha@host/neondb?sslmode=require
DIRECT_URL=postgresql://usuario:senha@host/neondb?sslmode=require

# Autenticação
JWT_SECRET=<gere com: openssl rand -base64 32>

# CORS (será atualizado após o deploy)
CORS_ORIGIN=https://sua-url.vercel.app

# E-mail (Resend)
RESEND_API_KEY=re_live_...
EMAIL_FROM=ROTINA <noreply@seu-dominio.com.br>
RESEND_SENDER_EMAIL=noreply@seu-dominio.com.br
APP_NAME=ROTINA

# Pagamento (escolha um)
# ASAAS_API_KEY=$aact_...
# ASAAS_ENV=production
# ASAAS_WEBHOOK_TOKEN=<token_seguro_aleatorio>

# OU Stripe
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_WEBHOOK_SECRET=whsec_...

# Opcional (recomendado)
# UPSTASH_REDIS_REST_URL=...
# UPSTASH_REDIS_REST_TOKEN=...
# SENTRY_DSN=...
# SENTRY_AUTH_TOKEN=...

# Logs
LOG_LEVEL=info

# URL da aplicação (para links em e-mails)
APP_URL=https://sua-url.vercel.app
```

**Importante:** 
- Use a URL que a Vercel gerar (ex: `https://rotina.vercel.app`) ou seu domínio próprio
- Copie e salve essa URL para usar nos próximos passos

### 4. Fazer deploy

1. Clique em **Deploy**
2. Aguarde o build completar
3. Se houver erro, verifique os logs e ajuste as variáveis se necessário

**Nota**: O build vai compilar tanto o backend quanto o frontend. Isso é normal e pode levar 2-3 minutos.

### 5. Rodar migrations no banco de dados

Após o deploy bem-sucedido, execute localmente (do seu computador):

```bash
cd backend
npx prisma migrate deploy
```

Isso criará todas as tabelas no banco de produção.

### 6. Atualizar CORS_ORIGIN com a URL final

1. Acesse a URL do seu deploy (ex: `https://rotina-sjlu.vercel.app`)
2. Volte na Vercel → **Settings → Environment Variables**
3. Atualize `CORS_ORIGIN` com a URL real
4. Atualize `APP_URL` com a URL real
5. Salve e faça um novo deploy

### 7. Configurar gateway de pagamento (se usar)

#### Asaas:
1. Acesse o painel do Asaas (produção)
2. Configure webhook: `https://sua-url.vercel.app/api/webhooks/asaas`
3. Copie a API Key e cole na Vercel

#### Stripe:
1. Acesse o Stripe Dashboard
2. Configure webhook: `https://sua-url.vercel.app/api/webhooks/stripe`
3. Copie as chaves e cole na Vercel

### 8. Testar a aplicação

Acesse a URL gerada pela Vercel e teste:
- ✅ Página carrega
- ✅ Registro de novo usuário
- ✅ Login
- ✅ Criar cliente, produto, pedido, chamado
- ✅ Envio de e-mail de teste

---

## 🎯 URL do seu deploy

Após o deploy, guarde esta URL:
```
https://rotina-sjlu.vercel.app
```

Atualize as variáveis `CORS_ORIGIN` e `APP_URL` com essa URL.

---

## 📝 Notas importantes

1. **Prisma Client**: É gerado automaticamente pelo `postinstall`
2. **Migrations**: Devem ser rodadas manualmente (`npx prisma migrate deploy`)
3. **Variáveis sensíveis**: Nunca versione `.env` ou credenciais
4. **Logs**: Use a aba **Logs** na Vercel para debug
5. **Banco de dados**: Certifique-se que o Neon/PostgreSQL está acessível publicamente

---

## 🔍 Troubleshooting

### Erro no build do Vite
- Verifique se o **Root Directory** está como `/` (não `/frontend`)
- Veja os logs completos do build na Vercel (clique em "View build logs")
- Erros comuns: falta de variáveis de ambiente, dependências faltando

### Erro no build
- Verifique se todas as variáveis estão configuradas na Vercel
- Veja os logs do build na Vercel

### Erro de conexão com banco
- Verifique se `DATABASE_URL` está correta
- Confirme que o banco permite conexões externas (Neon sim)

### CORS error
- Atualize `CORS_ORIGIN` com a URL exata da Vercel
- Faça um novo deploy após alterar variáveis

### API retorna 404
- Verifique se o backend iniciou corretamente (logs da Vercel)
- Confirme que as rotas estão corretas

---

Pronto! Após seguir esses passos, seu site estará no ar e não precisará mais abrir o VSCode para manter funcionando.