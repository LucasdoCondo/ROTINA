# Troubleshooting: Erros 500 e 404 em Produção

## Erro 500 em `/api/auth/login`

### Causas Possíveis

1. **JWT_SECRET não configurado na Vercel**
2. **DATABASE_URL não configurada ou incorreta**
3. **Erro de conexão com o banco de dados**
4. **Senha não corresponde ao hash no banco**

### Como Diagnosticar

#### 1. Verificar Logs da Vercel

```bash
1. Acesse: https://vercel.com
2. Selecione seu projeto (rotina-sjlu)
3. Vá na aba "Logs" ou "Functions"
4. Clique em "View Runtime Logs"
5. Tente fazer login em https://rotina-sjlu.vercel.app
6. Observe o erro no terminal da Vercel
```

#### 2. Verificar Variáveis de Ambiente na Vercel

```bash
1. Vercel Dashboard > Seu Projeto > Settings > Environment Variables
2. Confira se EXISTEM e estão CORRETAS:

OBRIGATÓRIAS:
✅ DATABASE_URL = postgresql://neondb_owner:npg_uIsO6jwhqUV8@ep-small-shape-ayw12f9x.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require
✅ JWT_SECRET = fZAixvd4HMBtLPn9I+SZlwV87qf3mys1vmrRsB+emWY=
✅ NODE_ENV = production
✅ CORS_ORIGIN = https://rotina-sjlu.vercel.app
✅ APP_URL = https://rotina-sjlu.vercel.app

OPCIONAIS:
⚪ RESEND_API_KEY = re_Ayf5mgbw...
⚪ EMAIL_FROM = ldc.214@hotmail.com
```

#### 3. Testar Conexão com Banco Localmente

```bash
cd backend
npx prisma db execute --stdin <<EOF
SELECT * FROM "Tenant";
EOF
```

#### 4. Verificar se Seed Foi Executado

```bash
cd backend
npx prisma studio
# Abra http://localhost:5555
# Verifique se a tabela "User" tem o usuário admin@empresa.com
```

### Soluções

#### Solução 1: Reconfigurar Variáveis na Vercel

```bash
1. Vercel Dashboard > Settings > Environment Variables
2. DELETE todas as variáveis antigas
3. ADICIONE novamente:

DATABASE_URL: postgresql://neondb_owner:npg_uIsO6jwhqUV8@ep-small-shape-ayw12f9x.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require
JWT_SECRET: fZAixvd4HMBtLPn9I+SZlwV87qf3mys1vmrRsB+emWY=
NODE_ENV: production
CORS_ORIGIN: https://rotina-sjlu.vercel.app
APP_URL: https://rotina-sjlu.vercel.app

4. Clique em "Save"
5. Vá em Deployments > clique em "..." do último deploy > "Redeploy"
```

#### Solução 2: Reexecutar Seed no Banco Online

```bash
# No seu computador
cd backend

# Garanta que o .env está com a DATABASE_URL correta
npx prisma db seed

# Saída esperada:
# ✅ Tenant criado: Empresa Padrão
# ✅ Admin criado: admin@empresa.com
# ✅ 5 módulos ativados
```

#### Solução 3: Verificar CORS

```bash
# Verificar se o CORS_ORIGIN está correto
# Deve ser EXATAMENTE o domínio da Vercel, sem barra no final

Errado: https://rotina-sjlu.vercel.app/
Errado: https://rotina-sjlu.vercel.app/api
Certo:  https://rotina-sjlu.vercel.app
```

---

## Erro 404 Após Login (ou ao acessar rotas)

### Causa

O Vercel não está redirecionando rotas do SPA (Single Page Application) para o `index.html`.

### Solução

#### 1. Verificar `vercel.json` na Raiz

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Se o arquivo não existir ou estiver incorreto, ele será criado/atualizado.

#### 2. Verificar Estrutura do Projeto na Vercel

```bash
A Vercel deve estar configurada como:

Root Directory: ./frontend
Build Command: npm run build
Output Directory: dist
```

#### 3. Verificar se há `vercel.json` no Frontend

```bash
frontend/vercel.json (deve existir)
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## Debug Passo a Passo Completo

### Passo 1: Verificar Logs em Tempo Real

```bash
# Instale Vercel CLI (opcional)
npm i -g vercel

# Autentique
vercel login

# Veja logs em tempo real
vercel logs https://rotina-sjlu.vercel.app --follow

# Tente fazer login e observe o erro
```

### Passo 2: Testar API Diretamente

```bash
# Teste a rota de login diretamente
curl -X POST https://rotina-sjlu.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresa.com","senha":"admin123"}'

# Resposta esperada (sucesso):
# {"message":"Login realizado com sucesso","usuario":{...},"token":"eyJ..."}

# Resposta com erro 500:
# {"error":"Erro interno no servidor"}

# Resposta com erro 401:
# {"message":"Usuário não encontrado"}
```

### Passo 3: Verificar Variáveis no Runtime

Adicione temporariamente este código no `backend/src/server.js`:

```javascript
// APENAS PARA DEBUG - REMOVA DEPOIS
console.log('=== VARIÁVEIS DE AMBIENTE ===');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Definida' : '❌ NÃO DEFINIDA');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Definida' : '❌ NÃO DEFINIDA');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN);
```

Faça um novo deploy e veja o log.

### Passo 4: Verificar Banco de Dados

```bash
# Conecte ao banco Neon
cd backend
npx prisma studio

# Verifique manualmente:
# 1. Tabela Tenant: tem 1 registro (Empresa Padrão)?
# 2. Tabela User: tem 1 registro (admin@empresa.com)?
# 3. A senha está hash?

# Se estiver vazio, reexecute o seed:
npx prisma db seed
```

---

## Erros Comuns e Soluções Rápidas

### ❌ "PrismaClientInitializationError"

```bash
Causa: DATABASE_URL incorreta ou banco inacessível

Solução:
1. Verifique se a connection string está correta
2. Teste a conexão:
   psql postgresql://neondb_owner:npg_uIsO6jwhqUV8@ep-small-shape-ayw12f9x.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require
3. Verifique se o banco está online no painel Neon
```

### ❌ "Secret key missing" ou "jwt.sign requires a secret"

```bash
Causa: JWT_SECRET não definida na Vercel

Solução:
1. Vercel Dashboard > Settings > Environment Variables
2. Adicione JWT_SECRET = fZAixvd4HMBtLPn9I+SZlwV87qf3mys1vmrRsB+emWY=
3. Redeploy
```

### ❌ "User not found" mas o seed foi executado

```bash
Causa: O login está buscando em outro banco (erro de DATABASE_URL)

Solução:
1. Verifique se DATABASE_URL é a mesma em:
   - backend/.env (local)
   - Vercel Dashboard > Environment Variables
2. Reexecute o seed com a DATABASE_URL correta
```

### ❌ "Invalid signature" ou "jwt malformed"

```bash
Causa: JWT_SECRET diferente entre geração e validação

Solução:
1. Use o MESMO JWT_SECRET em:
   - backend/.env
   - Vercel Dashboard
2. Limpe o localStorage do browser
3. Faça login novamente
```

### ❌ CORS Error

```bash
Causa: CORS_ORIGIN não corresponde ao domínio da Vercel

Solução:
1. CORS_ORIGIN deve ser: https://rotina-sjlu.vercel.app
2. SEM barra no final
3. SEM /api
4. Redeploy após alterar
```

---

## Checklist de Verificação

Antes de reportar um problema, verifique:

- [ ] JWT_SECRET está definida na Vercel
- [ ] DATABASE_URL está definida na Vercel
- [ ] CORS_ORIGIN está definida corretamente
- [ ] NODE_ENV = production
- [ ] Migrations executadas no banco online
- [ ] Seed executado no banco online
- [ ] Usuário admin@empresa.com existe no banco
- [ ] Vercel fez deploy após configurar variáveis
- [ ] vercel.json tem rewrite para SPA
- [ ] Logs da Vercel não mostram erros críticos
- [ ] Conexão com banco funciona (teste com npx prisma studio)

---

## Comandos Úteis para Debug

```bash
# Ver logs da Vercel em tempo real
vercel logs https://rotina-sjlu.vercel.app --follow

# Testar API de login
curl -X POST https://rotina-sjlu.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresa.com","senha":"admin123"}'

# Ver estrutura do banco
cd backend && npx prisma studio

# Verificar status do banco
cd backend && npx prisma status

# Ver migrations aplicadas
cd backend && npx prisma migrate status

# Reexecutar seed
cd backend && npx prisma db seed
```

---

## Próximos Passos Se Nada Funcionar

1. **Tente criar um novo tenant** via `/api/auth/registrar` para ver se o erro persiste
2. **Verifique se há quotas** no plano Neon (banco gratuito tem limites)
3. **Teste localmente com a DATABASE_URL de produção:**
   ```bash
   cd backend
   npx prisma migrate deploy
   npx prisma db seed
   npm run dev
   # Teste login em http://localhost:3001
   ```
4. **Considere usar um banco local temporário** para desenvolvimento
5. **Abra um issue** no GitHub com:
   - Logs da Vercel
   - Output do curl
   - Output do npx prisma studio (screenshot)