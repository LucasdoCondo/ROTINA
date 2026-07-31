# ROTINA — Passos de Publicação (Go-to-Market)

Guia executável em sequência. Siga na ordem. Após cada etapa, valide o resultado antes de ir para a próxima.

---

## Pré-requisitos
- Conta no GitHub/GitLab com acesso para criar repositório
- Conta na Vercel vinculada ao repositório
- Banco PostgreSQL de produção (Neon/Supabase/Railway)
- Conta Resend (domínio verificado)
- Gateway de pagamento (Asaas ou Stripe) em modo produção

---

## Etapa 1 — Preparar repositório e código

### 1.1 Inicializar git (se ainda não estiver)
```bash
git init
git add .
git commit -m "chore: prepara estrutura para deploy em produção"
```

### 1.2 Criar repositório remoto
- Crie o repositório no GitHub/GitLab (ex: `ROTINA`)
- Aponte para o remoto e suba:
```bash
git remote add origin https://github.com/<SEU_USUARIO>/ROTINA.git
git branch -M main
git push -u origin main
```

---

## Etapa 2 — Deploy na Vercel

### 2.1 Importar projeto
- Na Vercel: **Add New Project** → importe o repositório `ROTINA`.

### 2.2 Configurar variáveis de ambiente (Painel da Vercel)
Vá em **Settings → Environment Variables** e cadastre para **Production**:

```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://usuario:senha@host/neondb?sslmode=require&pgbouncer=true
DIRECT_URL=postgresql://usuario:senha@host/neondb?sslmode=require
JWT_SECRET=<gere com: openssl rand -base64 32>
CORS_ORIGIN=https://app.rotina.com.br

RESEND_API_KEY=re_live_...
EMAIL_FROM=ROTINA <noreply@rotina.com.br>
RESEND_SENDER_EMAIL=noreply@rotina.com.br
APP_NAME=ROTINA

ASAAS_API_KEY=$aact_...
ASAAS_ENV=production
ASAAS_WEBHOOK_TOKEN=<token_seguro_aleatorio>

# OU Stripe (se usar):
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_WEBHOOK_SECRET=whsec_...

# Opcional (recomendado):
# UPSTASH_REDIS_REST_URL=...
# UPSTASH_REDIS_REST_TOKEN=...
# SENTRY_DSN=...
# SENTRY_AUTH_TOKEN=...
# SUPABASE_URL=...
# SUPABASE_SERVICE_KEY=...
LOG_LEVEL=info
```

### 2.3 Disparar deploy
- Clique em **Deploy** na Vercel.
- Acompanhe os logs. Se o build falhar, ajuste e repita.

### 2.4 Validar URL de produção
- Guarde a URL pública gerada pela Vercel (ex: `https://seu-app.vercel.app` ou domínio próprio `https://app.rotina.com.br`).
- Atualize `CORS_ORIGIN` e as URLs dos webhooks para esse domínio final.

---

## Etapa 3 — Migrações do banco (Prisma)

### 3.1 Ajustar DATABASE_URL para conexão direta (sem pooler) para migrations
- Na Vercel: garanta que `DIRECT_URL` está preenchido e sem `pgbouncer` (conexão direta).

### 3.2 Rodar migrations na base de produção
Do seu computador, com o banco acessível:
```bash
cd backend
npx prisma migrate deploy
```

### 3.3 (Opcional) Popular dados iniciais
```bash
cd backend
npx prisma db seed
```

Valide as tabelas criadas (`Tenant`, `User`, `Subscription`, `AuditLog`, etc.).

---

## Etapa 4 — Configurar gateway de pagamento (produção)

### 4.1 Asaas
- Acesse `https://www.asaas.com` (produção).
- Copie a `API Key` de produção (`$aact_...`) e cole nas variáveis da Vercel.
- Configure o webhook:
  - URL: `https://app.rotina.com.br/api/webhooks/asaas`
  - Eventos: `PAYMENT_CREATED`, `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`, `SUBSCRIPTION_CREATED`, `SUBSCRIPTION_UPDATED`, `SUBSCRIPTION_DELETED`
  - Copie o token e cole em `ASAAS_WEBHOOK_TOKEN` na Vercel.

### 4.2 Stripe
- Acesse `https://dashboard.stripe.com/apikeys`.
- Copie `Secret key` live (`sk_live_...`) e `Publishable key` live (`pk_live_...`).
- Webhook:
  - URL: `https://app.rotina.com.br/api/webhooks/stripe`
  - Eventos: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
  - Copie `Webhook secret` (`whsec_...`) e cole em `STRIPE_WEBHOOK_SECRET` na Vercel.

---

## Etapa 5 — Configurar DNS e domínio próprio

### 5.1 Aplicativo na Vercel
- Adicione o domínio personalizado na Vercel (ex: `app.rotina.com.br`).

### 5.2 DNS no provedor (Cloudflare/Registro.br/etc)
- Aponte `@` para o IP da Vercel e `www` para o CNAME da Vercel conforme instruído no painel.

---

## Etapa 6 — Testes End-to-End rápidos


Run commands below and validate:
- Verify app loads at production URL.
- Confirm CORS and API calls return correct responses.
- Execute login/register.
- Create a client, product, order, and ticket; send a test email and verify it is not spam; complete a small purchase and confirm webhook is received.
- Review logs/Sentry for errors.

Execute these checks before treating Etapa 6 as completed.