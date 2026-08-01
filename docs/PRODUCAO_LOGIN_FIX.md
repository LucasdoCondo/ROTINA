# Guia: Corrigir Login em Produção (Vercel)

## Problema Identificado

O login em produção (admin@empresa.com / admin123) não funciona porque:

1. **Banco de dados online está vazio** - O seed foi executado apenas no banco local
2. **SQLite não funciona na Vercel** - Banco local não persiste em ambiente serverless
3. **Variáveis de ambiente não configuradas** - Vercel não acessa arquivos .env locais

## Solução Passo a Passo

### 1. Criar Banco de Dados PostgreSQL em Nuvem

Escolha um dos provedores gratuitos:

#### Opção A: Neon.tech (Recomendado)
```bash
1. Acesse: https://neon.tech
2. Crie uma conta gratuita
3. Clique em "New Project"
4. Nome: rotina-db
5. Escolha região: US East (ou mais próxima)
6. Copie a connection string (formato: postgres://user:pass@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require)
```

#### Opção B: Supabase
```bash
1. Acesse: https://supabase.com
2. Crie uma conta
3. Clique em "New Project"
4. Nome: rotina-db
5. Senha do banco: (escolha uma senha forte)
6. Aguarde criação
7. Vá em Settings > Database > Connection string
8. Copie a URI (formato: postgresql://postgres:senha@db.xxxxx.supabase.co:5432/postgres)
```

### 2. Configurar Variáveis de Ambiente na Vercel

```bash
1. Acesse o painel da Vercel: https://vercel.com
2. Selecione seu projeto (app.rotinacodx.com.br)
3. Vá em Settings > Environment Variables
4. Adicione as seguintes variáveis:

Variável: DATABASE_URL
Valor: postgresql://user:pass@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
(Use a connection string do passo 1)

Variável: JWT_SECRET
Valor: fZAixvd4HMBtLPn9I+SZlwV87qf3mys1vmrRsB+emWY=
(ou gere uma nova com: node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")

Variável: JWT_EXPIRES_IN
Valor: 7d

Variável: CORS_ORIGIN
Valor: https://app.rotinacodx.com.br

Variável: APP_URL
Valor: https://app.rotinacodx.com.br

Variável: NODE_ENV
Valor: production
```

### 3. Executar Migrations e Seed no Banco Online

No seu computador local, execute:

```bash
# 1. Instale o Prisma CLI se não tiver
cd backend
npm install prisma --save-dev

# 2. Altere temporariamente a DATABASE_URL no arquivo .env local
# Edite backend/.env e substitua a DATABASE_URL pela URL do banco online

# 3. Gere o Prisma Client
npx prisma generate

# 4. Execute as migrations (cria as tabelas)
npx prisma migrate deploy

# 5. Execute o seed (cria usuário admin e dados de exemplo)
npx prisma db seed

# 6. (Opcional) Verifique os dados
npx prisma studio
# Abrirá em http://localhost:5555 - você pode ver as tabelas criadas
```

### 4. Atualizar frontend/.env para Produção

No arquivo `frontend/.env` (crie se não existir):

```bash
VITE_API_URL=https://app.rotinacodx.com.br/api
```

E rebuild do frontend:

```bash
# Na raiz do projeto
npm run build

# Commit e push para atualizar na Vercel
git add .
git commit -m "fix: configurar API URL para produção"
git push
```

### 5. Verificar Deploy na Vercel

```bash
1. Vá para a Vercel
2. Na aba Deployments, veja se o último deploy foi bem-sucedido
3. Clique em "..." > "View Build Logs" para verificar erros
4. Se houver erro de DATABASE_URL, verifique se configurou corretamente no passo 2
```

### 6. Testar Login

```bash
1. Acesse: https://app.rotinacodx.com.br
2. Login: admin@empresa.com
3. Senha: admin123
```

## Credenciais de Teste

Após o seed, você terá acesso a:

```
Email: admin@empresa.com
Senha: admin123
Role: ADMIN

Outros usuários criados:
- 3 clientes de exemplo (CRM)
- 5 produtos de exemplo (E-commerce)
- 3 chamados de exemplo
- 5 módulos ativos: dashboard, chamados, crm, ecommerce, relatorios
```

## Troubleshooting

### Erro: "Can't reach database server"

```bash
# Verifique se a DATABASE_URL está correta na Vercel
# Verifique se o banco está acessível publicamente
# Teste a conexão localmente primeiro
```

### Erro: "Migration failed"

```bash
# Execute localmente com a DATABASE_URL de produção
npx prisma migrate deploy

# Se houver erro de schema, pode precisar fazer reset (CUIDADO: apaga dados)
npx prisma migrate reset
```

### Erro: "User not found" após seed

```bash
# Verifique se o seed executou corretamente
npx prisma db seed

# Verifique os logs de seed para erros
```

### Erro: "Invalid JWT"

```bash
# Verifique se JWT_SECRET está configurado na Vercel
# Verifique se o mesmo JWT_SECRET está sendo usado
# Gere um novo se necessário
```

## Comandos Úteis

```bash
# Ver status do banco
npx prisma status

# Ver dados das tabelas
npx prisma studio

# Criar nova migration
npx prisma migrate dev --name nome_da_migration

# Executar migrations em produção
npx prisma migrate deploy

# Executar seed em produção
npx prisma db seed

# Ver logs da Vercel
vercel logs https://app.rotinacodx.com.br
```

## Estrutura do Banco de Dados

Após o seed, o banco terá:

```
Tenants: 1 (Empresa Padrão)
├── Users: 1 (admin@empresa.com)
├── Modules: 5 (dashboard, chamados, crm, ecommerce, relatorios)
├── Subscription: 1 (plano pro, ativa)
├── Clients: 3 (João Silva, Maria Santos, Pedro Oliveira)
├── Products: 5 (Notebook, Mouse, Teclado, Monitor, Webcam)
└── Tickets: 3 (problemas de exemplo)
```

## Importante

- **NUNCA** commite arquivos `.env` com credenciais
- **SEMPRE** use variáveis de ambiente na Vercel
- **SEMPRE** execute migrations antes do seed
- **SEMPRE** teste localmente antes de fazer deploy

## Próximos Passos

Depois de configurar:

1. [ ] Criar conta na Neon/Supabase
2. [ ] Configurar DATABASE_URL na Vercel
3. [ ] Executar migrations
4. [ ] Executar seed
5. [ ] Testar login em produção
6. [ ] Cadastrar mais usuários reais
7. [ ] Configurar domínio customizado
8. [ ] Configurar SSL/HTTPS (automático na Vercel)
9. [ ] Configurar backup do banco
10. [ ] Monitorar uso e custos