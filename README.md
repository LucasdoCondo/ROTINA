# ROTINA

Sistema SaaS multi-tenant para gestão empresarial, com módulos de Dashboard, CRM, Chamados, E-commerce e Gestão de Membros.

<p align="center">
  <img alt="Licença" src="https://img.shields.io/badge/Licen%C3%A7a-MIT-blue.svg" />
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-18.x-green" />
  <img alt="React" src="https://img.shields.io/badge/React-18-blue" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-12%2B-blue" />
</p>

## Arquitetura

- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: React + Vite
- **Autenticação**: JWT (JSON Web Token)
- **Multi-tenant**: Suporte a múltiplas empresas (tenants)

## Funcionalidades

### Módulos Implementados

1. **Dashboard** - Painel administrativo com gráficos e estatísticas
2. **Gestão de Usuários** - CRUD de usuários por empresa
3. **Sistema de Chamados** - Gestão de tickets/suporte
4. **CRM** - Gestão de clientes
5. **E-commerce** - Produtos e pedidos
6. **Membros** - Gestão de assinaturas/planos

### Características

- **Multi-tenant**: Cada empresa tem seus dados isolados
- **Autenticação segura**: JWT com sessões online
- **API RESTful**: Endpoints bem estruturados
- **Interface moderna**: React com design responsivo
- **Rate limiting**: Proteção contra ataques
- **Validações**: Backend e frontend

## Desenvolvimento (backend)

Requisitos: Node.js 18+ e Docker. O `backend/.env` já vem com a conexão padrão
que bate com o `docker-compose.yml` da raiz (`rotina:rotina@localhost:5432/rotina_dev`).

```bash
cd backend

# 1. Sobe o PostgreSQL (docker compose da raiz) + migração inicial + seed demo
npm run db:setup
# equivalente: npm run db:up && npm run db:migrate && npm run db:seed

# 2. API em modo watch (http://localhost:3000/api/v1)
npm run dev

# 3. Utilitários
npm run db:studio    # Prisma Studio (http://localhost:5555)
npm run db:logs      # logs do container do banco
npm run db:down      # para o banco (dados preservados no volume)
```

Contas demo criadas pelo seed: `admin@acme.io` (ADMIN), `agent@acme.io` (AGENT) e
`member@acme.io` (MEMBER) — senha única de desenvolvimento: `Sup3r-S3cret-Dev!`.

### Frontend (React + Vite + TypeScript)

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
npm run build     # typecheck (tsc) + build de produção
```

Configure a URL da API em `frontend/.env` (`VITE_API_URL=http://localhost:3000/api/v1`).
O cliente HTTP injeta automaticamente o JWT (`Authorization`) e o `X-Tenant-ID`
em todas as requisições, com refresh do access token em caso de 401.


