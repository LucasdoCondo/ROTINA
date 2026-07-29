# Estratégia de Hospedagem e Infraestrutura

> **Custo Quase Zero no Início** — Guia completo para deploy e operação do SaaS utilizando Free Tiers de serviços modernos.

---

## Sumário

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Frontend & API Routes — Vercel](#2-frontend--api-routes--vercel)
3. [Backend API — Render ou Railway](#3-backend-api--render-ou-railway)
4. [Banco de Dados (PostgreSQL) — Neon](#4-banco-de-dados-postgresql--neon)
5. [Filas & Tarefas Assíncronas — Upstash Redis](#5-filas--tarefas-assíncronas--upstash-redis)
6. [Envio de E-mails — Resend](#6-envio-de-e-mails--resend)
7. [Pagamento / Cobrança — Stripe ou Asaas](#7-pagamento--cobrança--stripe-ou-asaas)
8. [Armazenamento de Arquivos — Supabase Storage](#8-armazenamento-de-arquivos--supabase-storage)
9. [Monitoramento & Observabilidade](#9-monitoramento--observabilidade)
10. [Pipeline de CI/CD](#10-pipeline-de-cicd)
11. [Estimativa de Custos (Mês 1-12)](#11-estimativa-de-custos-mês-1-12)
12. [Plano de Migração para Produção Paga](#12-plano-de-migração-para-produção-paga)
13. [Checklist de Deploy](#13-checklist-de-deploy)

---

## 1. Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     DNS / Domínio (Cloudflare)               │
│                         (Free Tier)                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Vercel (Free Tier)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Frontend React (Vite) + API Routes (serverless)     │   │
│  │  - Páginas estáticas e SSR                            │   │
│  │  - API Routes para webhooks e SSR                    │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Render / Railway (Free Tier)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Backend API (Express + Prisma)                      │   │
│  │  - Endpoints REST                                    │   │
│  │  - Autenticação JWT                                  │   │
│  │  - Webhooks de pagamento                             │   │
│  └──────────────────────────────────────────────────────┘   │
└──────┬──────────────────────────────┬───────────────────────┘
       │                              │
┌──────▼──────────┐    ┌──────────────▼───────────────────────┐
│  Neon (Free)     │    │  Upstash Redis (Free)                │
│  PostgreSQL      │    │  - BullMQ (filas)                    │
│  - Dados         │    │  - Cache                             │
│  - Multi-tenancy │    │  - Rate limiting                     │
└─────────────────┘    └──────────────┬───────────────────────┘
                                      │
                            ┌─────────▼─────────────────────────┐
                            │  Resend (Free Tier: 100 emails/dia)│
                            │  - E-mails transacionais           │
                            │  - Notificações                    │
                            └───────────────────────────────────┘
```

---

## 2. Frontend & API Routes — Vercel

### 2.1 Por que Vercel?

| Característica | Benefício |
|----------------|-----------|
| **Deploy automático via Git** | Conecta ao GitHub, faz deploy a cada `git push` |
| **SSL gratuito** | Certificados HTTPS automáticos com renovação |
| **CDN global** | Edge Network em 100+ cidades |
| **Suporte nativo a Vite** | Build otimizado para React |
| **Serverless Functions** | API Routes sem gerenciar servidor |
| **Free Tier generoso** | 100GB bandwidth, 6000 build minutes/mês |

### 2.2 Configuração

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy (na raiz do frontend)
cd frontend
vercel --prod
```

### 2.3 Arquivo de Configuração (`vercel.json`)

Crie na raiz do frontend:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "env": {
    "VITE_API_URL": "@api_url"
  }
}
```

### 2.4 Variáveis de Ambiente no Vercel

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `VITE_API_URL` | `https://api.seudominio.com` | URL da API backend |
| `VITE_APP_NAME` | `ROTINA` | Nome do SaaS |

### 2.5 Domínio Personalizado

1. No dashboard da Vercel, vá em **Settings > Domains**
2. Adicione seu domínio (ex: `app.rotina.com.br`)
3. Configure os registros DNS no Cloudflare:
   - **CNAME**: `app` → `cname.vercel-dns.com`
4. SSL é ativado automaticamente

---

## 3. Backend API — Render ou Railway

### 3.1 Opção Recomendada: Render

| Característica | Free Tier |
|----------------|-----------|
| **Uptime** | Web Services dormem após 15 min inatividade |
| **Bandwidth** | 100 GB/mês |
| **RAM** | 512 MB |
| **Custom Domains** | Sim (com SSL) |
| **Cron Jobs** | Sim (Cron Jobs grátis) |

### 3.2 Configuração no Render

```yaml
# render.yaml (Infrastructure as Code)
services:
  - type: web
    name: rotina-api
    env: node
    buildCommand: npm install && npx prisma generate
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: rotina-db
          property: connectionString
      - key: REDIS_URL
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: NODE_ENV
        value: production
```

### 3.3 Estratégia para Evitar o "Sleep" do Free Tier

O Render coloca serviços gratuitos para dormir após 15 min de inatividade. Soluções:

```javascript
// backend/src/utils/keepAlive.js
const https = require('https');

const WAKE_INTERVAL = 14 * 60 * 1000; // 14 minutos

function keepAlive(url) {
  setInterval(() => {
    https.get(url, (res) => {
      console.log(`[KeepAlive] ${url} → Status: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error(`[KeepAlive] Erro: ${err.message}`);
    });
  }, WAKE_INTERVAL);
}

module.exports = { keepAlive };
```

> **Alternativa**: Use **UptimeRobot** (gratuito) para pingar a cada 5 minutos.

### 3.4 Railway (Alternativa)

| Característica | Free Tier |
|----------------|-----------|
| **Créditos** | $5/mês grátis (sem cartão) |
| **Uptime** | Sem sleep (diferencial) |
| **Limite** | 500 horas de execução/mês |

**Recomendação**: Comece com **Render** e migre para **Railway** se o sleep for problemático.

---

## 4. Banco de Dados (PostgreSQL) — Neon

### 4.1 Por que Neon?

| Característica | Benefício |
|----------------|-----------|
| **PostgreSQL serverless** | Escala a zero quando não usado |
| **Free Tier: 0.5GB** | Suficiente para MVP com ~50 tenants |
| **Branching** | Cria branches do DB para staging/testes |
| **Auto-pause** | Pausa após 5 min inatividade (economiza) |
| **Connection Pooling** | PgBouncer integrado |
| **Backup automático** | Point-in-time recovery de 7 dias |

### 4.2 Configuração

```bash
# 1. Criar projeto no Neon
# Acesse: https://console.neon.tech

# 2. Obter DATABASE_URL
# Formato: postgres://user:pass@ep-xxxx.us-east-2.aws.neon.tech/neondb

# 3. Configurar no .env
DATABASE_URL="postgres://user:pass@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

### 4.3 Pool de Conexões (Recomendado)

Neon fornece pooling automático via `-pooler` no hostname:

```
# URL com pool (recomendado para produção)
DATABASE_URL="postgres://user:pass@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"
```

### 4.4 Schema Multi-tenant

O schema atual já suporta multi-tenancy via `tenantId`. Certifique-se de:

```prisma
// backend/prisma/schema.prisma (já configurado)
model Tenant {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  // ... outros campos
}
```

### 4.5 Migrações no Deploy

```json
// backend/package.json (scripts)
{
  "scripts": {
    "deploy": "npx prisma migrate deploy && node src/server.js"
  }
}
```

### 4.6 Supabase (Alternativa)

| Característica | Free Tier |
|----------------|-----------|
| **PostgreSQL** | 500 MB |
| **Auth** | Built-in (50k users) |
| **Storage** | 1 GB |
| **API REST** | Auto-gerada |

> **Escolha**: Neon é mais focado em DB serverless puro. Supabase é melhor se precisar de Auth + Storage integrados.

---

## 5. Filas & Tarefas Assíncronas — Upstash Redis

### 5.1 Por que Upstash?

| Característica | Free Tier |
|----------------|-----------|
| **Redis serverless** | Sem gerenciamento de servidor |
| **10.000 requests/dia** | Suficiente para MVP |
| **256 MB** | Armazenamento |
| **TLS automático** | Criptografia em trânsito |
| **Global** | Baixa latência |

### 5.2 Configuração

```bash
# 1. Criar database no Upstash
# Acesse: https://console.upstash.com

# 2. Obter credenciais
UPSTASH_REDIS_REST_URL="https://xxxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="xxxx"
```

### 5.3 Integração com BullMQ

```javascript
// backend/src/config/queue.js
const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis(process.env.UPSTASH_REDIS_REST_URL, {
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
  enableAutoPipelining: true,
  maxRetriesPerRequest: null,
  tls: {}
});

// Filas do sistema
const queues = {
  email: new Queue('email', { connection }),
  report: new Queue('report', { connection }),
  notification: new Queue('notification', { connection }),
  webhook: new Queue('webhook', { connection })
};

// Worker de e-mail
const emailWorker = new Worker('email', async (job) => {
  const { to, subject, html } = job.data;
  await sendEmail({ to, subject, html });
}, { connection });

module.exports = { queues, connection };
```

### 5.4 Casos de Uso

| Tarefa | Fila | Prioridade |
|--------|------|------------|
| Envio de e-mail de boas-vindas | `email` | Alta |
| Geração de relatório mensal | `report` | Baixa |
| Notificação push | `notification` | Média |
| Webhook de pagamento | `webhook` | Alta |
| Limpeza de dados expirados | `cleanup` | Baixa |

---

## 6. Envio de E-mails — Resend

### 6.1 Por que Resend?

| Característica | Free Tier |
|----------------|-----------|
| **100 emails/dia** | Suficiente para MVP |
| **Domínio personalizado** | Envie de `noreply@seudominio.com` |
| **API moderna** | SDK oficial para Node.js |
| **Logs e analytics** | Dashboard de entregabilidade |
| **Templates** | Suporte a React Email |

### 6.2 Configuração

```bash
# 1. Criar conta em https://resend.com
# 2. Verificar domínio (DNS)
# 3. Obter API Key

# .env
RESEND_API_KEY="re_xxxx"
EMAIL_FROM="ROTINA <noreply@rotina.com.br>"
```

### 6.3 Serviço de E-mail

```javascript
// backend/src/services/emailService.js
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const emailService = {
  async sendWelcome(user) {
    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: 'Bem-vindo ao ROTINA!',
      html: `
        <h1>Olá ${user.name}!</h1>
        <p>Sua conta foi criada com sucesso.</p>
        <p><a href="${process.env.APP_URL}/login">Acessar o sistema</a></p>
      `
    });
  },

  async sendPasswordReset(user, token) {
    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: 'Redefinição de senha',
      html: `
        <h1>Redefina sua senha</h1>
        <p>Clique no link abaixo para redefinir sua senha:</p>
        <p><a href="${process.env.APP_URL}/reset-password?token=${token}">
          Redefinir senha
        </a></p>
        <p>Este link expira em 1 hora.</p>
      `
    });
  },

  async sendInvoice(user, invoice) {
    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: `Fatura #${invoice.id} - ROTINA`,
      html: `
        <h1>Fatura mensal</h1>
        <p>Valor: R$ ${invoice.amount}</p>
        <p>Vencimento: ${invoice.dueDate}</p>
      `
    });
  }
};

module.exports = emailService;
```

### 6.4 Templates com React Email (Opcional)

```bash
npm install @react-email/components react-email
```

```jsx
// backend/src/emails/WelcomeEmail.jsx
import { Html, Head, Body, Container, Text, Button } from '@react-email/components';

export default function WelcomeEmail({ name }) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Text>Olá {name}!</Text>
          <Text>Sua conta foi criada com sucesso.</Text>
          <Button href="https://app.rotina.com.br/login">
            Acessar o sistema
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
```

---

## 7. Pagamento / Cobrança — Stripe ou Asaas

### 7.1 Stripe (Global)

| Característica | Descrição |
|----------------|-----------|
| **Taxa** | 2.9% + $0.30 por transação |
| **Recorrência** | Suporte nativo a subscriptions |
| **Webhooks** | Eventos em tempo real |
| **Test mode** | Ambiente de testes completo |
| **Checkout** | Páginas de pagamento hospedadas |

### 7.2 Asaas (Brasil — Recomendado)

| Característica | Descrição |
|----------------|-----------|
| **PIX** | Cobrança com baixa automática |
| **Boleto** | Registrado com baixa automática em 48h |
| **Cartão de crédito** | Recorrência |
| **Split** | Split de pagamentos (para marketplace) |
| **API** | REST completa |
| **Taxa** | A partir de 0,99% (PIX) |

### 7.3 Integração com Asaas

```javascript
// backend/src/services/paymentService.js
const axios = require('axios');

const asaas = axios.create({
  baseURL: process.env.ASAAS_ENV === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3',
  headers: {
    'access_token': process.env.ASAAS_API_KEY,
    'Content-Type': 'application/json'
  }
});

const paymentService = {
  async createCustomer(tenant) {
    const { data } = await asaas.post('/customers', {
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      cpfCnpj: tenant.document
    });
    return data;
  },

  async createSubscription(customerId, plan) {
    const { data } = await asaas.post('/subscriptions', {
      customer: customerId,
      billingType: 'PIX', // ou CREDIT_CARD, BOLETO
      value: plan.price,
      nextDueDate: plan.startDate,
      cycle: 'MONTHLY',
      description: `Plano ${plan.name} - ROTINA`
    });
    return data;
  },

  async processWebhook(req, res) {
    const event = req.body;
    
    switch (event.event) {
      case 'PAYMENT_RECEIVED':
        await this.handlePaymentReceived(event.payment);
        break;
      case 'PAYMENT_OVERDUE':
        await this.handlePaymentOverdue(event.payment);
        break;
      case 'SUBSCRIPTION_CANCELED':
        await this.handleSubscriptionCanceled(event.subscription);
        break;
    }
    
    return res.status(200).json({ received: true });
  }
};

module.exports = paymentService;
```

### 7.4 Webhook de Pagamento

```javascript
// backend/src/routes/webhook.js
router.post('/asaas', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    await paymentService.processWebhook(req, res);
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

## 8. Armazenamento de Arquivos — Supabase Storage

### 8.1 Configuração

| Característica | Free Tier |
|----------------|-----------|
| **Armazenamento** | 1 GB |
| **Bandwidth** | 2 GB/mês |
| **Uploads** | 100 MB por arquivo |

### 8.2 Integração

```javascript
// backend/src/services/storageService.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const storageService = {
  async uploadFile(bucket, path, file) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) throw error;
    return data;
  },

  async getPublicUrl(bucket, path) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data.publicUrl;
  },

  async deleteFile(bucket, path) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);
    
    if (error) throw error;
  }
};

module.exports = storageService;
```

---

## 9. Monitoramento & Observabilidade

### 9.1 Ferramentas Gratuitas

| Ferramenta | Uso | Free Tier |
|------------|-----|-----------|
| **Sentry** | Error tracking | 5k eventos/mês |
| **Better Stack** | Uptime monitoring | 3 URLs, 10 min checks |
| **Logtail** | Log management | 1 GB/mês |
| **Google Analytics** | User analytics | Ilimitado |

### 9.2 Health Check Endpoint

```javascript
// backend/src/routes/health.js
router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: false,
      redis: false
    }
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = true;
  } catch (error) {
    health.status = 'degraded';
    health.checks.database = false;
  }

  try {
    await redis.ping();
    health.checks.redis = true;
  } catch (error) {
    health.status = 'degraded';
    health.checks.redis = false;
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

---

## 10. Pipeline de CI/CD

### 10.1 GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd backend && npm install
          cd ../frontend && npm install
      
      - name: Run tests
        run: |
          cd backend && npm test
          cd ../frontend && npm test

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Render
        uses: johnbeynon/render-deploy-action@v0.0.8
        with:
          service-id: ${{ secrets.RENDER_SERVICE_ID }}
          api-key: ${{ secrets.RENDER_API_KEY }}

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 11. Estimativa de Custos (Mês 1-12)

### 11.1 Cenário Free Tier (MVP — até 50 tenants)

| Serviço | Custo | Limites |
|---------|-------|---------|
| Vercel (Frontend) | **$0** | 100GB bandwidth |
| Render (Backend) | **$0** | 512MB RAM, dorme após 15min |
| Neon (PostgreSQL) | **$0** | 0.5GB storage |
| Upstash (Redis) | **$0** | 10k requests/dia |
| Resend (Email) | **$0** | 100 emails/dia |
| Cloudflare (DNS) | **$0** | Ilimitado |
| GitHub (Repo) | **$0** | Repositórios privados |
| **Total** | **$0/mês** | |

### 11.2 Cenário Growth (50-500 tenants)

| Serviço | Plano | Custo |
|---------|-------|-------|
| Vercel | Pro ($20) | $20/mês |
| Render | Starter ($7) | $7/mês |
| Neon | Launch ($19) | $19/mês |
| Upstash | Pay-as-you-go | ~$5/mês |
| Resend | Growth ($10) | $10/mês |
| Asaas | Taxas | ~2% das transações |
| **Total** | | **~$61/mês + taxas** |

### 11.3 Cenário Scale (500+ tenants)

| Serviço | Plano | Custo |
|---------|-------|-------|
| Vercel | Enterprise | $100-500/mês |
| Railway | Pro | $20-50/mês |
| Neon | Scale | $49-199/mês |
| Upstash | Pro | $20-50/mês |
| Resend | Pro | $50-100/mês |
| **Total** | | **~$239-899/mês** |

---

## 12. Plano de Migração para Produção Paga

### Fase 1: MVP (Mês 1-3) — Custo Zero

```
✅ Vercel Free (Frontend)
✅ Render Free (Backend)
✅ Neon Free (PostgreSQL)
✅ Upstash Free (Redis)
✅ Resend Free (Email)
✅ Cloudflare Free (DNS)
```

### Fase 2: Validação (Mês 3-6) — ~$61/mês

```
⬆️ Vercel Pro ($20)
⬆️ Render Starter ($7)
⬆️ Neon Launch ($19)
⬆️ Upstash Pay-as-you-go (~$5)
⬆️ Resend Growth ($10)
✅ Asaas (taxas por transação)
```

### Fase 3: Crescimento (Mês 6+) — Sob Demanda

```
⬆️ Migrar Render → Railway (melhor performance)
⬆️ Migrar Neon → Supabase Pro (se precisar de Auth)
⬆️ Adicionar Sentry (error tracking)
⬆️ Adicionar Better Stack (monitoramento)
```

---

## 13. Checklist de Deploy

### Pré-deploy

- [ ] Domínio configurado no Cloudflare
- [ ] Variáveis de ambiente definidas em todos os serviços
- [ ] `DATABASE_URL` apontando para Neon (produção)
- [ ] `JWT_SECRET` gerado (seguro e único)
- [ ] `RESEND_API_KEY` configurada
- [ ] `ASAAS_API_KEY` configurada (sandbox primeiro)
- [ ] `UPSTASH_REDIS_URL` configurada
- [ ] CORS configurado para domínio de produção
- [ ] Rate limiting ativado
- [ ] Helmet (segurança) ativado
- [ ] SSL/HTTPS forçado

### Deploy

- [ ] Push para branch `main` do GitHub
- [ ] GitHub Actions executa testes automaticamente
- [ ] Vercel faz deploy do frontend
- [ ] Render faz deploy do backend
- [ ] Prisma migrate executado no banco de produção
- [ ] Seed executado (se necessário)

### Pós-deploy

- [ ] Health check endpoint responde `200 OK`
- [ ] Login/registro funcionando
- [ ] Envio de e-mail funcionando
- [ ] Webhook de pagamento configurado
- [ ] Monitoramento ativo (Better Stack)
- [ ] Backup automático configurado (Neon já faz)
- [ ] Teste de carga básico realizado

---

## Resumo Final

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   🚀 ROTINA - Estratégia de Hospedagem                     │
│                                                             │
│   Custo Mês 1-3:  R$ 0,00                                  │
│   Custo Mês 4-6:  ~R$ 300,00                               │
│   Custo Mês 7+:   Sob Demanda (escala conforme receita)    │
│                                                             │
│   Stack: Vercel + Render + Neon + Upstash + Resend + Asaas │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

> **Próximos passos**: 
> 1. Criar contas nos serviços (Neon, Upstash, Resend, Asaas)
> 2. Configurar variáveis de ambiente
> 3. Fazer deploy inicial
> 4. Configurar domínio personalizado
> 5. Ativar monitoramento