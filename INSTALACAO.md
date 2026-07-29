# Guia de Instalação - Sistema SaaS Empresarial

Este guia irá ajudá-lo a configurar e executar o sistema em seu ambiente local.

## Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Instalação do Backend](#instalação-do-backend)
3. [Configuração do Banco de Dados](#configuração-do-banco-de-dados)
4. [Instalação do Frontend](#instalação-do-frontend)
5. [Executando a Aplicação](#executando-a-aplicação)
6. [Primeiro Acesso](#primeiro-acesso)
7. [Solução de Problemas](#solução-de-problemas)

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** (versão 16.x ou superior) - [Download](https://nodejs.org/)
- **PostgreSQL** (versão 12.x ou superior) - [Download](https://www.postgresql.org/download/)
- **npm** (geralmente instalado com Node.js) ou **yarn**

### Verificando as Instalações

```bash
# Verificar Node.js
node --version

# Verificar npm
npm --version

# Verificar PostgreSQL
psql --version
```

## Instalação do Backend

### Passo 1: Navegue até a pasta do backend

```bash
cd backend
```

### Passo 2: Instale as dependências

```bash
npm install
```

Este comando irá instalar todas as dependências listadas no `package.json`, incluindo:
- Express (framework web)
- PostgreSQL (driver para banco de dados)
- JWT (autenticação)
- Bcrypt (criptografia de senhas)
- E outras dependências

### Passo 3: Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:

**No Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**No Linux/Mac:**
```bash
cp .env.example .env
```

### Passo 4: Edite o arquivo `.env`

Abra o arquivo `.env` em seu editor de texto e configure as seguintes variáveis:

```env
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=saas_sistema
DB_USER=postgres
DB_PASSWORD=sua_senha_aqui

# JWT
JWT_SECRET=sua_chave_secreta_super_segura_aqui_mude_em_producao
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000
```

**Importante:**
- Altere `DB_PASSWORD` para a senha do seu PostgreSQL
- Altere `JWT_SECRET` para uma string longa e aleatória (use um gerador de senhas)
- Em produção, use valores diferentes e mais seguros

## Configuração do Banco de Dados

### Passo 1: Crie o banco de dados

Abra o terminal do PostgreSQL (psql) e execute:

```bash
psql -U postgres
```

Dentro do psql, execute:

```sql
CREATE DATABASE saas_sistema;
```

Para sair do psql:
```sql
\q
```

### Passo 2: Execute o script SQL

Volte para a pasta do backend e execute o script que cria as tabelas:

**No Windows:**
```bash
cd backend
psql -U postgres -d saas_sistema -f src/config/schema.sql
```

**No Linux/Mac:**
```bash
cd backend
psql -U postgres -d saas_sistema -f src/config/schema.sql
```

Você verá várias mensagens indicando que as tabelas foram criadas com sucesso.

### Passo 3: Verifique as tabelas criadas

Opcionalmente, você pode verificar se as tabelas foram criadas:

```bash
psql -U postgres -d saas_sistema
```

Dentro do psql:
```sql
\dt
```

Você deve ver as seguintes tabelas:
- tenants
- usuarios
- tenant_modulos
- usuarios_online
- chamados
- clientes
- produtos
- pedidos
- membros

## Instalação do Frontend

### Passo 1: Navegue até a pasta do frontend

Abra um **novo terminal** e navegue até a pasta do frontend:

```bash
cd frontend
```

**Importante:** Mantenha o terminal do backend aberto, você precisará dele depois.

### Passo 2: Instale as dependências

```bash
npm install
```

Este comando irá instalar todas as dependências do frontend, incluindo:
- React 18
- React Router v6
- Axios (requisições HTTP)
- Recharts (gráficos)
- Lucide React (ícones)
- E outras dependências

### Passo 3: Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:

**No Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**No Linux/Mac:**
```bash
cp .env.example .env
```

O arquivo `.env` do frontend já vem configurado com a URL da API. Apenas certifique-se de que está assim:

```env
VITE_API_URL=http://localhost:3001/api
```

## Executando a Aplicação

Você precisa de **dois terminais** abertos: um para o backend e outro para o frontend.

### Terminal 1: Backend

```bash
cd backend
npm run dev
```

Você verá uma mensagem parecida com:
```
🚀 Servidor rodando na porta 3001
🌍 Ambiente: development
🔗 API: http://localhost:3001/api
💚 Health: http://localhost:3001/api/health
```

### Terminal 2: Frontend

```bash
cd frontend
npm run dev
```

Você verá uma mensagem parecida com:
```
  VITE v4.4.9  ready in 1234 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### Acesse a aplicação

Abra seu navegador e acesse:

```
http://localhost:3000
```

## Primeiro Acesso

### 1. Registre uma nova empresa

1. Acesse http://localhost:3000/registrar
2. Preencha os dados da empresa:
   - Nome da Empresa (obrigatório)
   - Email da Empresa (obrigatório)
   - CNPJ (opcional)
   - Telefone (opcional)
   - Endereço (opcional)
   - Plano (básico, premium ou enterprise)
3. Preencha os dados do usuário administrador:
   - Nome Completo (obrigatório)
   - Email (obrigatório)
   - Senha (obrigatório, mínimo 6 caracteres)
   - Confirmar Senha
4. Clique em "Criar Conta"

### 2. Faça login

Após o cadastro, você será redirecionado automaticamente para o Dashboard. Se não for redirecionado:

1. Acesse http://localhost:3000/login
2. Digite o email e senha cadastrados
3. Clique em "Entrar"

### 3. Explore o sistema

Você agora tem acesso a:
- **Dashboard**: Visão geral com estatísticas e gráficos
- **Usuários**: Gerenciar usuários da sua empresa
- **Chamados**: Sistema de tickets/suporte
- **Clientes**: Gestão de clientes (CRM)
- **Produtos**: Catálogo de produtos (e-commerce)
- **Pedidos**: Gestão de pedidos
- **Membros**: Sistema de assinaturas

## Solução de Problemas

### Erro de conexão com o banco de dados

**Problema:** `Error: connect ECONNREFUSED` ou `Erro ao conectar ao banco de dados`

**Solução:**
1. Verifique se o PostgreSQL está rodando:
   ```bash
   # No Windows
   services.msc
   # Procure por "postgresql" e verifique se está "Em execução"

   # No Linux/Mac
   sudo systemctl status postgresql
   ```
2. Verifique as credenciais no arquivo `.env`
3. Verifique se o banco de dados foi criado:
   ```bash
   psql -U postgres -l
   ```

### Porta já em uso

**Problema:** `Error: listen EADDRINUSE: address already in use :::3001`

**Solução:**
1. Encontre o processo que está usando a porta:
   ```bash
   # No Windows
   netstat -ano | findstr :3001

   # No Linux/Mac
   lsof -i :3001
   ```
2. Mate o processo ou altere a porta no arquivo `.env`

### Erro ao executar o schema.sql

**Problema:** Erros de sintaxe SQL

**Solução:**
1. Verifique se você está usando PostgreSQL (não MySQL)
2. Verifique se a extensão `uuid-ossp` está instalada:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

### CORS errors no frontend

**Problema:** `Access-Control-Allow-Origin` error

**Solução:**
1. Verifique se o backend está rodando na porta 3001
2. Verifique se `CORS_ORIGIN` no `.env` do backend está configurado para `http://localhost:3000`
3. Reinicie o backend após alterar o `.env`

### Token expira muito rápido

**Problema:** Usuário é deslogado após poucos minutos

**Solução:**
1. Verifique a variável `JWT_EXPIRES_IN` no `.env`
2. Aumente o valor (ex: `7d` para 7 dias, `24h` para 24 horas)

### Página em branco no frontend

**Problema:** Frontend carrega mas página fica em branco

**Solução:**
1. Abra o DevTools do navegador (F12)
2. Verifique a aba Console para erros
3. Verifique se todas as dependências foram instaladas:
   ```bash
   cd frontend
   npm install
   ```
4. Reinicie o servidor do frontend

## Estrutura de Ambientes

### Desenvolvimento
- Backend: http://localhost:3001
- Frontend: http://localhost:3000
- Banco de dados: localhost:5432

### Produção (recomendações)
Para colocar em produção, você precisará:
1. Configurar um servidor de produção (PM2, Docker, etc.)
2. Usar variáveis de ambiente seguras
3. Configurar HTTPS
4. Usar um banco de dados de produção
5. Configurar um domínio e proxy reverso (nginx)

## Próximos Passos

Após configurar o sistema, você pode:

1. Cadastrar mais usuários
2. Criar chamados de teste
3. Cadastrar clientes
4. Adicionar produtos
5. Criar pedidos
6. Gerenciar membros/assinaturas

Explore todas as funcionalidades e personalize conforme suas necessidades!

## Suporte

Se encontrar problemas não documentados aqui:
1. Verifique o arquivo README.md
2. Consulte a documentação das tecnologias utilizadas
3. Abra uma issue no repositório do projeto

Bom uso do sistema! 🚀