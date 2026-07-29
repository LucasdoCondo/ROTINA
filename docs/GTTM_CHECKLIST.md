# Checklist de Virada de Chave (Go-to-Market)

Este documento consolida todos os passos necessários para colocar o SaaS ROTINA em produção. Siga cada seção rigorosamente antes de liberar para clientes.

---

## 1. Configurar Domínio Próprio e Registros DNS

### 1.1. Apontar Domínio na Hospedagem (Vercel/Netlify)

1. **Adicionar domínio personalizado:**
   - Vercel: `Settings > Domains > Add Domain`
   - Netlify: `Domain Management > Add custom domain`
   - Domínio sugerido: `app.rotina.com.br` ou `seu-saas.com.br`

2. **Configurar registros DNS no seu provedor** (Cloudflare, Registro.br, GoDaddy, etc.):

| Tipo | Nome/Host | Valor/Destino | TTL |
|------|-----------|---------------|-----|
| A | `@` | IP da Vercel/Netlify | Automático |
| CNAME | `www` | `cname.vercel-dns.com` ou similar | Automático |

### 1.2. Configurar DNS do Resend para E-mails

No provedor DNS do seu domínio, adicionar os 3 registros TXT fornecidos pelo Resend:

1. **SPF** (autoriza o Resend a enviar e-mails):
   - Tipo: `TXT`
   - Nome/Host: `@` (ou domínio raiz)
   - Valor: `v=spf1 include:resend.com ~all`

2. **DKIM** (assinatura digital dos e-mails):
   - Tipo: `TXT`
   - Nome/Host: `resend._domainkey`
   - Valor: `[chave fornecida pelo Resend]`

3. **DMARC** (política anti-spam):
   - Tipo: `TXT`
   - Nome/Host: `_dmarc`
   - Valor: `v=DMARC1; p=quarantine; rua=mailto:admin@rotina.com.br`

**Importante:** Sem esses registros, e-mails transacionais (boas-vindas, convites, reset de senha) cairão no SPAM dos clientes.

---

## 2. Mudar Gateway de Pagamento para Modo Produção (Live Mode)

### 2.1. Asaas (Recomendado para Brasil)

1. **Obter credenciais de produção:**
   - Acessar `https://www.asaas.com` (ambiente de produção, não sandbox)
   - `Configurações > Integração > API`
   - Copiar `API Key` de produção (formato: `$aact_...`)

2. **Atualizar variáveis de ambiente (.env):**
   ```env
   ASAAS_API_KEY=$aact_xxxxx
   ASAAS_ENV=production
   ```

3. **Configurar Webhook:**
   - No painel Asaas: `Configurações > Webhook`
   - URL do webhook: `https://app.rotina.com.br/api/webhooks/asaas`
   - Eventos a escutar: `PAYMENT_CREATED`, `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`, `SUBSCRIPTION_CREATED`, `SUBSCRIPTION_UPDATED`, `SUBSCRIPTION_DELETED`
   - Token de segurança: gerar uma string aleatória e salvar em `ASAAS_WEBHOOK_TOKEN`

### 2.2. Stripe (Alternativa Global)

1. **Obter credenciais de produção:**
   - Acessar `https://dashboard.stripe.com/apikeys`
   - Copiar `Secret key` live (formato: `sk_live_...`)
   - Copiar `Publishable key` live (formato: `pk_live_...`)

2. **Atualizar variáveis de ambiente (.env):**
   ```env
   STRIPE_SECRET_KEY=sk_live_xxxxx
   STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
   ```

3. **Configurar Webhook:**
   - No painel Stripe: `Developers > Webhooks > Add endpoint`
   - URL do endpoint: `https://app.rotina.com.br/api/webhooks/stripe`
   - Eventos a escutar: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
   - Copiar `Webhook secret` (formato: `whsec_...`) e salvar em `STRIPE_WEBHOOK_SECRET`

---

## 3. Estrutura do .env.production

Use o template abaixo como referência completa para configurar o ambiente de produção:

```env
# ==========================================
# 1. APLICAÇÃO & NAVEGADOR (FRONTEND)
# ==========================================
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://seusaas.com.br"
NEXT_PUBLIC_APP_NAME="ROTINA"

# ==========================================
# 2. AUTENTICAÇÃO (JWT)
# ==========================================
# Gere uma chave aleatória forte usando: openssl rand -base64 32
JWT_SECRET="sua_chave_secreta_super_segura_aqui_32_chars"

# ==========================================
# 3. BANCO DE DADOS (POSTGRESQL / PRISMA)
# ==========================================
# Conexão direta ou via Connection Pooler (ex: Neon, Supabase, Railway)
# Certifique-se de incluir ?sslmode=require no final para conexões de produção
DATABASE_URL="postgresql://usuario:senha@ep-exemplo.region.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"

# Usado especificamente para migrações do Prisma quando utiliza connection pooler
DIRECT_URL="postgresql://usuario:senha@ep-exemplo.region.aws.neon.tech/neondb?sslmode=require"

# ==========================================
# 4. PAGAMENTOS & RECORRÊNCIA (ASAAS OU STRIPE)
# ==========================================
# Chaves em MODO LIVE (Produção)

# Asaas (recomendado para Brasil):
ASAAS_API_KEY="$aact_..."
ASAAS_ENV="production"
ASAAS_WEBHOOK_TOKEN="token_de_seguranca_do_webhook"

# OU Stripe (alternativa global):
# STRIPE_PUBLISHABLE_KEY="pk_live_51N..."
# STRIPE_SECRET_KEY="sk_live_51N..."
# STRIPE_WEBHOOK_SECRET="whsec_..."

# IDs dos Planos/Produtos cadastrados em modo Live
# NEXT_PUBLIC_STRIPE_PRICE_STARTER="price_1N..."
# NEXT_PUBLIC_STRIPE_PRICE_PRO="price_1N..."

# ==========================================
# 5. E-MAILS TRANSACIONAIS (RESEND)
# ==========================================
# Chave de API de Produção
RESEND_API_KEY="re_live_123456789..."

# Remetente usando o domínio próprio autenticado no DNS (SPF/DKIM)
EMAIL_FROM="ROTINA <noreply@rotina.com.br>"
RESEND_SENDER_EMAIL="noreply@rotina.com.br"

# ==========================================
# 6. FILAS & TAREFAS ASSÍNCRONAS (UPSTASH REDIS)
# ==========================================
# Para gerenciamento de filas (BullMQ), rate limit e cache
UPSTASH_REDIS_REST_URL="https://exemplo.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AZ...="

# ==========================================
# 7. OBSERVABILIDADE & MONITORAMENTO (SENTRY)
# ==========================================
SENTRY_DSN="https://exemplo@o0.ingest.sentry.io/0"
SENTRY_AUTH_TOKEN="sntrys_..." # Usado pela Vercel no build para enviar Source Maps

# ==========================================
# 8. LOGS DO SERVIDOR (PINO)
# ==========================================
LOG_LEVEL="info"

# ==========================================
# 9. CORS & API
# ==========================================
CORS_ORIGIN="https://seusaas.com.br"
PORT="3001"

# ==========================================
# 10. ARMAZENAMENTO (SUPABASE)
# ==========================================
# Obrigatório apenas se usar upload de arquivos
# SUPABASE_URL="https://xxxx.supabase.co"
# SUPABASE_SERVICE_KEY="eyJxxxx"
```

### 3.1. Checklist de Variáveis Obrigatórias

Verificar se **todas** as variáveis abaixo estão preenchidas no ambiente de produção:

#### Backend
- [ ] `NODE_ENV=production`
- [ ] `PORT=3001` (ou porta configurada na hospedagem)
- [ ] `DATABASE_URL` com conexão SSL (`sslmode=require`)
- [ ] `DIRECT_URL` para migrations do Prisma
- [ ] `JWT_SECRET` (chave forte gerada com `openssl rand -base64 32`)
- [ ] `CORS_ORIGIN` apontando para domínio de produção

**E-mails:**
- [ ] `RESEND_API_KEY` (chave de produção, não `re_test_...`)
- [ ] `EMAIL_FROM` com domínio verificado (ex: `noreply@seusaas.com.br`)

**Pagamento (escolher um):**
- [ ] **Asaas:** `ASAAS_API_KEY` (produção), `ASAAS_ENV=production`, `ASAAS_WEBHOOK_TOKEN`
- [ ] **OU Stripe:** `STRIPE_SECRET_KEY` (sk_live_...), `STRIPE_WEBHOOK_SECRET`

**Monitoramento:**
- [ ] `SENTRY_DSN` configurado
- [ ] `LOG_LEVEL=info` (ou `error` em produção)

**Opcional (recomendado):**
- [ ] `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` (para filas e cache)
- [ ] `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` (para upload de arquivos)

#### Frontend
- [ ] `NEXT_PUBLIC_APP_URL=https://seusaas.com.br`
- [ ] `NEXT_PUBLIC_APP_NAME=NomeDoSeuSaaS`
- [ ] `SENTRY_DSN` (se usar Sentry no frontend)

### 3.2. Cuidados de Segurança para Produção

1. **Nunca versionar o `.env` ou `.env.production`:**
   - Adicione ao `.gitignore`
   - Cole variáveis diretamente na interface da plataforma de deploy (Vercel/Render/Railway)

2. **Variáveis com prefixo `NEXT_PUBLIC_`:**
   - Tudo que começa com `NEXT_PUBLIC_` fica visível no código-fonte do navegador
   - **NUNCA** coloque chaves secretas, tokens ou API keys privadas nelas
   - Use apenas para valores públicos como URL da aplicação, chaves públicas do Stripe, etc.

3. **Conexão com Banco em Produção:**
   - SEMPRE use `sslmode=require` para criptografar conexões
   - SEMPRE use Connection Pooler (`pgbouncer=true` ou porta 6543 no Supabase) para evitar esgotar conexões do PostgreSQL em ambientes serverless
   - Configure `DIRECT_URL` separado para migrations do Prisma (não usa pooler)

4. **Executar migrations antes do deploy:**
   ```bash
   # Backend
   npx prisma migrate deploy
   # OU se usar prisma com --schema
   npx prisma migrate deploy --schema=./prisma/schema.prisma
   ```

5. **Backup Automático:**
   - Neon: Backup automático diário (verificar retention policy)
   - Supabase: Backup automático no plano Pro+
   - Railway/Supabase: Backup manual recomendado antes de migrations grandes

### 3.3. Verificação Pré-Deploy

Execute este checklist antes de colocar no ar:

```bash
# 1. Verificar se todas as variáveis estão preenchidas
# Vercel:
vercel env ls production

# Railway/Render:
# Acessar dashboard e verificar seção Environment Variables

# 2. Testar conexão com banco
cd backend && npx prisma db pull

# 3. Rodar migrations
npx prisma migrate deploy

# 4. Testar conexão com API de e-mail
# Enviar e-mail de teste via Resend Dashboard

# 5. Testar webhook do gateway de pagamento
# Usar ngrok para testar localmente antes
```

---

## 4. Testes Pré-Deploy

Antes de liberar para produção, executar:

1. **Testes locais:**
   ```bash
   cd backend && npm run test
   cd frontend && npm run test
   ```

2. **Teste de webhook:**
   - Usar `ngrok` para testar webhooks localmente
   - Ou usar ferramenta como `webhook.site` para validar estrutura

3. **Teste de e-mails:**
   - Enviar e-mail de boas-vindas para e-mail de teste
   - Verificar se não cai no SPAM
   - Confirmar links de confirmação funcionam

4. **Teste de pagamento:**
   - Fazer compra completa em ambiente de produção (mesmo que seja R$0,01)
   - Verificar se webhook é recebido e status é atualizado
   - Testar fluxo de cancelamento/estorno

5. **Verificar LGPD:**
   - Testar `/api/tenant/export` (exportação de dados)
   - Testar `/api/tenant/delete` (exclusão em cascata)
   - Confirmar que dados são realmente excluídos

---

## 5. Deploy Contínuo (CI/CD)

### Vercel (Frontend + Backend)
- Conectar repositório GitHub
- Configurar variáveis de ambiente no painel da Vercel
- Deploy automático a cada push na `main`

### Netlify + Railway/Render (alternativa)
- Frontend: Netlify
- Backend: Railway ou Render
- Banco: Neon ou Supabase

---

## 6. Monitoramento Pós-Deploy

1. **Sentry:** Verificar se erros estão sendo capturados
2. **Uptime:** Configurar UptimeRobot ou similar para monitorar disponibilidade
3. **Logs:** Verificar logs da hospedagem por erros 500
4. **Métricas:** Verificar uso de banco, memória e CPU no primeiro dia

---

## 7. Comunicado para Clientes

Após deploy bem-sucedido:
1. Enviar e-mail a clientes beta sobre lançamento oficial
2. Atualizar status de "Em Breve" para "Disponível" no site
3. Publicar changelog com novidades da versão 1.0

---

## Contato de Suporte para Deploy

Em caso de problemas durante o deploy:
- Documentação Vercel: https://vercel.com/docs
- Documentação Neon: https://neon.tech/docs
- Documentação Asaas: https://docs.asaas.com
- Documentação Resend: https://resend.com/docs

**Última atualização:** 29/07/2026