# Variáveis de Ambiente para Vercel

**IMPORTANTE:** Você **NÃO importa** arquivos `.env`. Você deve adicionar cada variável **manualmente** no painel da Vercel.

---

## Como Adicionar Variáveis na Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Selecione o projeto `rotina-sjlu`
3. Vá em **Settings** → **Environment Variables**
4. Adicione as variáveis abaixo
5. Marque **Production**, **Preview** e **Development**
6. Clique em **Save**
7. Faça um **Redeploy**

---

## Variáveis do Backend

### Obrigatórias

```
NOME: DATABASE_URL
VALOR: postgresql://neondb_owner:npg_uIsO6jwhqUV8@ep-small-shape-ayw12f9x.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require
AMBIENTE: Production, Preview, Development
```

```
NOME: DIRECT_URL
VALOR: postgresql://neondb_owner:npg_uIsO6jwhqUV8@ep-small-shape-ayw12f9x.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require
AMBIENTE: Production, Preview, Development
```

```
NOME: JWT_SECRET
VALOR: fZAixvd4HMBtLPn9I+SZlwV87qf3mys1vmrRsB+emWY=
AMBIENTE: Production, Preview, Development
```

```
NOME: JWT_EXPIRES_IN
VALOR: 7d
AMBIENTE: Production, Preview, Development
```

```
NOME: NODE_ENV
VALOR: production
AMBIENTE: Production
```

```
NOME: PORT
VALOR: 3001
AMBIENTE: Production, Preview, Development
```

```
NOME: CORS_ORIGIN
VALOR: https://rotina-sjlu.vercel.app
AMBIENTE: Production, Preview, Development
```

```
NOME: APP_URL
VALOR: https://rotina-sjlu.vercel.app
AMBIENTE: Production, Preview, Development
```

```
NOME: LOG_LEVEL
VALOR: info
AMBIENTE: Production, Preview, Development
```

---

### Opcionais (se usar os recursos)

```
NOME: RESEND_API_KEY
VALOR: re_Ayf5mgbw...
AMBIENTE: Production, Preview, Development
```

```
NOME: EMAIL_FROM
VALOR: ldc.214@hotmail.com
AMBIENTE: Production, Preview, Development
```

```
NOME: RESEND_SENDER_EMAIL
VALOR: ldc.214@hotmail.com
AMBIENTE: Production, Preview, Development
```

```
NOME: APP_NAME
VALOR: ROTINA
AMBIENTE: Production, Preview, Development
```

```
NOME: ASAAS_API_KEY
VALOR: $aact_...
AMBIENTE: Production
```

```
NOME: ASAAS_ENV
VALOR: production
AMBIENTE: Production
```

```
NOME: ASAAS_WEBHOOK_TOKEN
VALOR: token_seguranca_webhook_producao
AMBIENTE: Production
```

```
NOME: UPSTASH_REDIS_REST_URL
VALOR: https://xxxx.upstash.io
AMBIENTE: Production, Preview, Development
```

```
NOME: UPSTASH_REDIS_REST_TOKEN
VALOR: xxxx
AMBIENTE: Production, Preview, Development
```

```
NOME: SENTRY_DSN
VALOR: https://xxxx@o0.ingest.sentry.io/0
AMBIENTE: Production, Preview, Development
```

```
NOME: SENTRY_AUTH_TOKEN
VALOR: sntrys_...
AMBIENTE: Production, Preview, Development
```

```
NOME: SUPABASE_URL
VALOR: https://xxxx.supabase.co
AMBIENTE: Production, Preview, Development
```

```
NOME: SUPABASE_SERVICE_KEY
VALOR: eyJxxxx
AMBIENTE: Production, Preview, Development
```

```
NOME: STRIPE_SECRET_KEY
VALOR: sk_live_...
AMBIENTE: Production
```

```
NOME: STRIPE_WEBHOOK_SECRET
VALOR: whsec_...
AMBIENTE: Production
```

---

## Variáveis do Frontend

```
NOME: VITE_API_URL
VALOR: https://rotina-sjlu.vercel.app/api
AMBIENTE: Production, Preview, Development
```

```
NOME: VITE_SENTRY_DSN
VALOR: https://xxxx@o0.ingest.sentry.io/0
AMBIENTE: Production, Preview, Development
```

---

## Arquivo de Referência

Você pode consultar:
- `backend/.env.production` — todas as variáveis do backend
- `backend/.env.example` — lista completa com descrições
- `frontend/.env.example` — variáveis do frontend

---

## Após Configurar

1. Clique em **Save**
2. Vá em **Deployments**
3. Clique em `...` no último deploy
4. Selecione **Redeploy**
5. Aguarde o build completar (2-3 minutos)
6. Teste o login em: https://rotina-sjlu.vercel.app

---

## Verificação Rápida

Execute este comando para verificar se o banco está configurado:

```bash
cd backend
npx prisma db execute --stdin <<EOF
SELECT * FROM "Tenant";
EOF
```

Se retornar 1 linha com "Empresa Padrão", está tudo certo.

---

**Credenciais de teste:**
- Email: `admin@empresa.com`
- Senha: `admin123`