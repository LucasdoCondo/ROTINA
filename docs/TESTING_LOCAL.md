# Guia de Testes Locais — Ambiente de Desenvolvimento

> Checklist completo para testar Webhooks, Assinatura e Pagamentos no seu ambiente local.

---

## Sumário

1. [Pré-requisitos](#1-pré-requisitos)
2. [Configuração Inicial](#2-configuração-inicial)
3. [Testando com Asaas (Sandbox)](#3-testando-com-asaas-sandbox)
4. [Testando com Stripe CLI](#4-testando-com-stripe-cli)
5. [Cartões e Dados de Teste](#5-cartões-e-dados-de-teste)
6. [Fluxo Completo de Teste](#6-fluxo-completo-de-teste)
7. [Verificando Resultados](#7-verificando-resultados)
8. [Solução de Problemas](#8-solução-de-problemas)

---

## 1. Pré-requisitos

### Ferramentas Necessárias

| Ferramenta | Versão | Instalação |
|------------|--------|------------|
| Node.js | 18+ | `winget install OpenJS.NodeJS.LTS` |
| PostgreSQL | 14+ | `winget install PostgreSQL.PostgreSQL` |
| Stripe CLI | Última | `winget install Stripe.StripeCLI` |
| ngrok (opcional) | Última | `winget install ngrok` |

### Contas Necessárias

- [ ] **Asaas Sandbox**: https://sandbox.asaas.com (criar conta de teste)
- [ ] **Stripe Test Mode**: https://dashboard.stripe.com/test (criar conta)
- [ ] **Neon (DB)**: https://console.neon.tech (ou PostgreSQL local)

---

## 2. Configuração Inicial

### 2.1 Variáveis de Ambiente

Copie o arquivo de exemplo e preencha com seus dados de teste:

```bash
cp backend/.env.example backend/.env
```

**Arquivo `.env` completo para desenvolvimento:**

```env
PORT=3001
NODE_ENV=development

# Database (PostgreSQL local)
DATABASE_URL="postgresql://postgres:minha_senha@localhost:5432/saas_sistema?schema=public"

# JWT
JWT_SECRET=minha_chave_secreta_super_segura_123
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# Asaas Sandbox
ASAAS_API_KEY="seu_token_sandbox_aqui"     # Obter em: https://sandbox.asaas.com/configuracoes/api
ASAAS_ENV="sandbox"
ASAAS_WEBHOOK_TOKEN="meu_token_webhook"     # Definir no Asaas > Webhooks

# Stripe Test
STRIPE_SECRET_KEY="sk_test_xxxxx"           # Obter em: https://dashboard.stripe.com/test/apikeys
STRIPE_WEBHOOK_SECRET="whsec_xxxxx"         # Gerado pelo Stripe CLI

# App
APP_URL="http://localhost:3000"
```

### 2.2 Iniciar o Banco de Dados

```bash
# 1. Iniciar PostgreSQL (se não estiver rodando)
net start postgresql-x64-16

# 2. Criar banco de dados
psql -U postgres -c "CREATE DATABASE saas_sistema;"

# 3. Rodar migrations do Prisma
cd backend
npx prisma migrate dev --name init

# 4. Seed (opcional - dados de exemplo)
node prisma/seed.js
```

### 2.3 Iniciar o Servidor

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Deve mostrar:
# ✅ Conexão com PostgreSQL estabelecida via Prisma
# 🚀 Servidor rodando na porta 3001
# 💚 Health: http://localhost:3001/api/health

# Terminal 2: Frontend
cd frontend
npm run dev

# Deve mostrar:
# ➜  Local: http://localhost:3000
```

### 2.4 Verificar Health Check

```bash
curl http://localhost:3001/api/health

# Resposta esperada:
# {
#   "status": "ok",
#   "message": "API SaaS funcionando",
#   "database": "connected",
#   "timestamp": "2026-07-29T..."
# }
```

---

## 3. Testando com Asaas (Sandbox)

### 3.1 Configurar Conta Sandbox

1. Acesse https://sandbox.asaas.com
2. Crie uma conta (não precisa de cartão de crédito)
3. Vá em **Configurações > API**
4. Gere um **Token de API** (chave de acesso)
5. Copie para `ASAAS_API_KEY` no `.env`

### 3.2 Configurar Webhook no Asaas

1. No Asaas Sandbox, vá em **Configurações > Webhooks**
2. Adicione um novo webhook:
   - **URL**: `https://SEU_DOMINIO.ngrok.io/api/webhooks/asaas`
   - **Token de segurança**: `meu_token_webhook` (mesmo do `.env`)
   - **Eventos**: Selecione TODOS os eventos de pagamento e assinatura
3. Salve

> **Nota**: O Asaas não consegue enviar webhooks para `localhost`.
> Use **ngrok** para expor seu servidor local:
> ```bash
> ngrok http 3001
> ```
> Copie a URL gerada (ex: `https://abc123.ngrok.io`) e use no webhook do Asaas.

### 3.3 Testar Criação de Checkout

```bash
# 1. Fazer login (obter token)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresa.com","senha":"123456"}'

# Resposta: { "token": "eyJxxx..." }

# 2. Listar planos
curl http://localhost:3001/api/assinatura/planos

# Resposta:
# {
#   "planos": [
#     { "id": "basic", "name": "Básico", "price": 49.90 },
#     { "id": "pro", "name": "Profissional", "price": 99.90 },
#     { "id": "enterprise", "name": "Enterprise", "price": 199.90 }
#   ]
# }

# 3. Criar checkout (PIX)
curl -X POST http://localhost:3001/api/assinatura/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"planId":"pro","billingType":"PIX"}'

# Resposta esperada:
# {
#   "message": "Checkout criado com sucesso",
#   "checkout": {
#     "id": "sub_xxxx",
#     "invoiceUrl": "https://sandbox.asaas.com/...",
#     "billingType": "PIX",
#     "value": 99.90
#   },
#   "subscription": {
#     "status": "INCOMPLETE",
#     "planId": "pro"
#   }
# }
```

### 3.4 Simular Pagamento no Asaas Sandbox

1. Abra o `invoiceUrl` retornado no checkout
2. Você verá a fatura no ambiente Sandbox do Asaas
3. Para simular o pagamento:
   - **PIX**: No dashboard do Asaas Sandbox, vá em **Cobranças**, encontre a cobrança e clique em "Confirmar pagamento"
   - **Boleto**: Use a opção "Confirmar pagamento" no dashboard
   - **Cartão**: Use os cartões de teste abaixo

### 3.5 Verificar Webhook Recebido

```bash
# Verificar logs do servidor
# O webhook deve mostrar:
[Webhook] Evento recebido: {
  type: 'payment.succeeded',
  originalEvent: 'PAYMENT_RECEIVED',
  subscriptionId: 'sub_xxxx',
  tenantId: 'tenant_id'
}
[Webhook] ✅ Assinatura ativada para tenant tenant_id

# Verificar status da assinatura
curl http://localhost:3001/api/webhooks/status \
  -H "Authorization: Bearer SEU_TOKEN"

# Resposta:
# {
#   "hasAccess": true,
#   "status": "ACTIVE",
#   "daysRemaining": 30
# }
```

---

## 4. Testando com Stripe CLI

### 4.1 Instalar Stripe CLI

```bash
# Windows (winget)
winget install Stripe.StripeCLI

# Verificar instalação
stripe --version
```

### 4.2 Login no Stripe

```bash
# Fazer login na sua conta Stripe
stripe login

# Isso abrirá o navegador para autenticação
# Após autorizar, um par de chaves será gerado
```

### 4.3 Iniciar Forward de Webhooks

```bash
# Terminal: Iniciar escuta e forward para localhost
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# Saída esperada:
# > Ready! Your webhook signing secret is whsec_xxxxxxxxx
# > Forwarding events to http://localhost:3001/api/webhooks/stripe
```

### 4.4 Configurar Chave no .env

Copie o `whsec_...` gerado pelo Stripe CLI:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxx
```

### 4.5 Disparar Eventos de Teste

```bash
# Terminal 2: Disparar eventos simulados

# 1. Pagamento confirmado
stripe trigger checkout.session.completed

# 2. Fatura paga (renovação)
stripe trigger invoice.payment_succeeded

# 3. Falha no pagamento
stripe trigger invoice.payment_failed

# 4. Assinatura cancelada
stripe trigger customer.subscription.deleted
```

### 4.6 Verificar Logs no Servidor

```bash
# O servidor deve mostrar:
[Stripe Webhook] Evento recebido: checkout.session.completed
[Stripe Webhook] Evento recebido: invoice.payment_succeeded
[Stripe Webhook] Evento recebido: invoice.payment_failed
[Stripe Webhook] Evento recebido: customer.subscription.deleted
```

---

## 5. Cartões e Dados de Teste

### 5.1 Asaas Sandbox

| Tipo | Dados | Resultado |
|------|-------|-----------|
| **PIX** | Gerar QR Code no checkout | Pagamento instantâneo |
| **Boleto** | Gerar boleto no checkout | Confirmar manualmente no dashboard |
| **Cartão de Crédito** | `5162 3061 0440 9125` | Aprovado |
| **Cartão de Crédito** | `5593 9140 4980 8260` | Recusado (saldo insuficiente) |
| **Cartão de Crédito** | `5383 3407 0077 1067` | Recusado (cartão vencido) |
| **Validade** | Qualquer data futura | - |
| **CVV** | Qualquer 3 dígitos | - |
| **CPF** | `249.715.657-60` | CPF válido para testes |

### 5.2 Stripe Test Mode

| Tipo | Número | Resultado |
|------|--------|-----------|
| **Visa** | `4242 4242 4242 4242` | Aprovado |
| **Visa (debit)** | `4000 0566 5566 5556` | Aprovado |
| **Mastercard** | `5555 5555 5555 4444` | Aprovado |
| **Amex** | `3782 822463 10005` | Aprovado |
| **Recusado** | `4000 0000 0000 0002` | Recusado |
| **3D Secure** | `4000 0025 0000 3155` | Requer autenticação |
| **Validade** | `12/34` (futuro) | - |
| **CVV** | Qualquer 3 dígitos | - |
| **CEP** | `12345` | - |

---

## 6. Fluxo Completo de Teste

### 6.1 Cenário: Novo Usuário Assina Plano Pro (PIX)

```bash
# 1. Registrar novo tenant
curl -X POST http://localhost:3001/api/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "empresa": "Empresa Teste Ltda",
    "slug": "empresa-teste",
    "email": "admin@empresateste.com",
    "senha": "123456",
    "nome": "Admin Teste",
    "cnpj": "24971565760",
    "telefone": "11999999999"
  }'

# 2. Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresateste.com","senha":"123456"}' \
  | jq -r '.token')

# 3. Verificar que não tem assinatura
curl http://localhost:3001/api/assinatura/minha-assinatura \
  -H "Authorization: Bearer $TOKEN"
# → 404: Nenhuma assinatura encontrada

# 4. Criar checkout do plano Pro (PIX)
curl -X POST http://localhost:3001/api/assinatura/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"planId":"pro","billingType":"PIX"}'
# → status: INCOMPLETE

# 5. Verificar que ainda não tem acesso
curl http://localhost:3001/api/webhooks/status \
  -H "Authorization: Bearer $TOKEN"
# → hasAccess: false, status: INCOMPLETE

# 6. SIMULAR: No Asaas Sandbox, confirmar pagamento manualmente
#    Ou usar Stripe CLI: stripe trigger checkout.session.completed

# 7. Verificar que o webhook foi processado
#    (olhar logs do servidor)

# 8. Verificar que agora tem acesso
curl http://localhost:3001/api/webhooks/status \
  -H "Authorization: Bearer $TOKEN"
# → hasAccess: true, status: ACTIVE, daysRemaining: 30

# 9. Verificar detalhes da assinatura
curl http://localhost:3001/api/assinatura/minha-assinatura \
  -H "Authorization: Bearer $TOKEN"
# → status: ACTIVE, planId: pro
```

### 6.2 Cenário: Falha no Pagamento (PAST_DUE)

```bash
# 1. Simular falha (Stripe CLI)
stripe trigger invoice.payment_failed

# 2. Verificar status
curl http://localhost:3001/api/webhooks/status \
  -H "Authorization: Bearer $TOKEN"
# → hasAccess: false, status: PAST_DUE

# 3. Tentar acessar API (deve bloquear)
curl http://localhost:3001/api/dashboard \
  -H "Authorization: Bearer $TOKEN"
# → 402: Pagamento pendente. Regularize sua assinatura.
```

### 6.3 Cenário: Cancelamento de Assinatura

```bash
# 1. Cancelar (apenas ADMIN)
curl -X POST http://localhost:3001/api/assinatura/cancelar \
  -H "Authorization: Bearer $TOKEN"
# → Assinatura cancelada com sucesso

# 2. Verificar status
curl http://localhost:3001/api/webhooks/status \
  -H "Authorization: Bearer $TOKEN"
# → hasAccess: false, status: CANCELED

# 3. Tentar fazer login (deve bloquear)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresateste.com","senha":"123456"}'
# → 403: Empresa desativada
```

---

## 7. Verificando Resultados

### 7.1 No Banco de Dados

```bash
# Conectar no PostgreSQL
psql -U postgres -d saas_sistema

# Verificar assinaturas
SELECT id, "tenantId", status, "planId", "currentPeriodEnd", "paymentAttempts"
FROM "Subscription";

# Verificar tenants
SELECT id, name, plan, active FROM "Tenant";

# Verificar webhooks recebidos (logs do servidor)
```

### 7.2 No Dashboard do Asaas Sandbox

1. Acesse https://sandbox.asaas.com
2. Vá em **Cobranças** → Veja todas as cobranças criadas
3. Vá em **Assinaturas** → Veja as assinaturas recorrentes
4. Vá em **Webhooks** → Veja o histórico de eventos enviados

### 7.3 No Stripe CLI

```bash
# Verificar eventos enviados
stripe logs tail

# Verificar status do forward
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

---

## 8. Solução de Problemas

### 8.1 Webhook não está sendo recebido

| Problema | Causa | Solução |
|----------|-------|---------|
| Asaas não envia webhook | URL não acessível | Usar ngrok para expor localhost |
| Stripe CLI não conecta | Porta ocupada | Verificar se servidor está rodando na porta 3001 |
| 401 Invalid signature | Token errado | Verificar `ASAAS_WEBHOOK_TOKEN` ou `STRIPE_WEBHOOK_SECRET` |
| Webhook chega mas não processa | Body parsing errado | Webhooks usam `express.raw()`, não `express.json()` |

### 8.2 Erros Comuns

```bash
# Erro: connect ECONNREFUSED localhost:5432
# Solução: PostgreSQL não está rodando
net start postgresql-x64-16

# Erro: Tenant não identificado para o pagamento
# Solução: Verificar se externalReference está sendo enviado no checkout

# Erro: SUBSCRIPTION_ALREADY_ACTIVE
# Solução: Usuário já tem assinatura ativa. Cancelar primeiro.

# Erro: 402 Payment Required
# Solução: Assinatura está PAST_DUE ou expirada. Regularizar pagamento.
```

### 8.3 Logs Detalhados

Para ver logs detalhados do webhook, execute o servidor com:

```bash
# Terminal: Backend com logs detalhados
cd backend
DEBUG=true npm run dev

# Os logs mostrarão:
[Webhook] Processando evento: payment.succeeded
[Webhook] ✅ Assinatura ativada para tenant xxx
[Asaas] Criando cliente: { name: 'Empresa Teste', email: '...' }
[Asaas] Assinatura criada: { id: 'sub_xxx', value: 99.90 }
[RBAC] Acesso negado: MEMBER tentou executar "billing:manage"
```

### 8.4 Resetar Ambiente de Teste

```bash
# 1. Resetar banco de dados
cd backend
npx prisma migrate reset --force

# 2. Rodar seed novamente
node prisma/seed.js

# 3. No Asaas Sandbox, cancelar assinaturas de teste
# 4. No Stripe CLI, reiniciar forward
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

---

## Resumo dos Endpoints

| Método | URL | Autenticação | Descrição |
|--------|-----|--------------|-----------|
| `GET` | `/api/health` | ❌ | Health check |
| `POST` | `/api/auth/registrar` | ❌ | Registrar novo tenant |
| `POST` | `/api/auth/login` | ❌ | Login |
| `GET` | `/api/assinatura/planos` | ❌ | Listar planos |
| `POST` | `/api/assinatura/checkout` | ✅ | Criar checkout |
| `GET` | `/api/assinatura/minha-assinatura` | ✅ | Minha assinatura |
| `GET` | `/api/assinatura/historico` | ✅ | Histórico de pagamentos |
| `POST` | `/api/assinatura/cancelar` | ✅ ADMIN | Cancelar assinatura |
| `POST` | `/api/webhooks/asaas` | ❌ (validação interna) | Webhook Asaas |
| `POST` | `/api/webhooks/stripe` | ❌ (validação interna) | Webhook Stripe |
| `GET` | `/api/webhooks/status` | ✅ | Status da assinatura |

---

## Checklist de Teste

### Testes Básicos
- [ ] Servidor inicia sem erros
- [ ] Health check retorna 200
- [ ] Login funciona
- [ ] Listar planos retorna 3 planos

### Testes de Checkout
- [ ] Criar checkout com PIX
- [ ] Criar checkout com Boleto
- [ ] Criar checkout com Cartão
- [ ] Tentar criar checkout sem plano → 400
- [ ] Tentar criar checkout com plano inexistente → 400
- [ ] Tentar criar checkout com assinatura ativa → 409

### Testes de Webhook
- [ ] Webhook Asaas com token válido → 200
- [ ] Webhook Asaas com token inválido → 401
- [ ] Webhook Stripe com assinatura válida → 200
- [ ] Webhook Stripe sem assinatura → 401
- [ ] Pagamento confirmado → status ACTIVE
- [ ] Pagamento vencido → status PAST_DUE
- [ ] Assinatura cancelada → status CANCELED

### Testes de Acesso
- [ ] Usuário sem assinatura → bloqueado
- [ ] Usuário com ACTIVE → acesso liberado
- [ ] Usuário com PAST_DUE → bloqueado (402)
- [ ] Usuário com CANCELED → bloqueado (402)
- [ ] Após pagamento → acesso liberado automaticamente

### Testes de RBAC
- [ ] MEMBER não pode criar cliente
- [ ] MANAGER pode criar cliente
- [ ] MANAGER não pode deletar cliente
- [ ] ADMIN pode deletar cliente
- [ ] MEMBER não pode cancelar assinatura
- [ ] ADMIN pode cancelar assinatura