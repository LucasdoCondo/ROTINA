# Deploy no Vercel — ROTINA

Este documento contém **apenas o que você precisa fazer manualmente**. Os arquivos do projeto já foram ajustados.

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