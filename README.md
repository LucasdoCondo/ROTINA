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
