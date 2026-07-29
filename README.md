# Sistema SaaS Empresarial

Sistema SaaS (Software as a Service) completo para gestão empresarial, com módulos de Dashboard, CRM, Chamados, E-commerce e Gestão de Membros.

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

## Pré-requisitos

- Node.js >= 16.x
- PostgreSQL >= 12.x
- npm ou yarn

## Instalação

### 1. Clone o repositório

```bash
git clone <seu-repositorio>
cd PROJETOS/ROTINA
```

### 2. Configure o Backend

```bash
cd backend
npm install
```

Crie um arquivo `.env` baseado no `.env.example`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=saas_sistema
DB_USER=postgres
DB_PASSWORD=sua_senha

# JWT
JWT_SECRET=sua_chave_secreta_super_segura_aqui
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000
```

### 3. Configure o Banco de Dados

Crie o banco de dados no PostgreSQL:

```bash
psql -U postgres
CREATE DATABASE saas_sistema;
```

Execute o script SQL para criar as tabelas:

```bash
psql -U postgres -d saas_sistema -f src/config/schema.sql
```

### 4. Configure o Frontend

```bash
cd ../frontend
npm install
```

Crie um arquivo `.env` baseado no `.env.example`:

```bash
cp .env.example .env
```

### 5. Inicie a aplicação

Em um terminal (backend):

```bash
cd backend
npm run dev
```

Em outro terminal (frontend):

```bash
cd frontend
npm run dev
```

Acesse: http://localhost:3000

## Uso

### Primeiro Acesso

1. Acesse http://localhost:3000/registrar
2. Preencha os dados da empresa e do usuário administrador
3. Faça login com as credenciais criadas

### Permissões

- **master**: Acesso total a todas as funcionalidades
- **admin**: Gerenciamento de usuários, chamados, clientes, produtos, pedidos e membros
- **user**: Visualização e criação de chamados

### Estrutura do Projeto

```
.
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js           # Conexão com PostgreSQL
│   │   │   └── schema.sql      # Schema do banco de dados
│   │   ├── controllers/        # Controladores da API
│   │   │   ├── authController.js
│   │   │   ├── dashboardController.js
│   │   │   ├── usuariosController.js
│   │   │   ├── chamadosController.js
│   │   │   ├── clientesController.js
│   │   │   ├── produtosController.js
│   │   │   ├── pedidosController.js
│   │   │   └── membrosController.js
│   │   ├── middleware/
│   │   │   └── auth.js         # Middleware de autenticação
│   │   ├── routes/             # Rotas da API
│   │   │   ├── auth.js
│   │   │   ├── dashboard.js
│   │   │   ├── usuarios.js
│   │   │   ├── chamados.js
│   │   │   ├── clientes.js
│   │   │   ├── produtos.js
│   │   │   ├── pedidos.js
│   │   │   └── membros.js
│   │   └── server.js           # Servidor Express
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/         # Componentes reutilizáveis
│   │   ├── pages/              # Páginas/rotas
│   │   │   ├── Login.jsx
│   │   │   ├── Registrar.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── layouts/
│   │   │   ├── MainLayout.jsx  # Layout principal com sidebar
│   │   │   └── MainLayout.css
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx # Context de autenticação
│   │   ├── services/
│   │   │   └── api.js          # Serviços de API
│   │   ├── App.jsx             # Componente principal com rotas
│   │   ├── main.jsx            # Ponto de entrada
│   │   └── index.css           # Estilos globais
│   ├── .env.example
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── package.json                # Workspace root
```

## API Endpoints

### Autenticação

- `POST /api/auth/registrar` - Registrar nova empresa
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/perfil` - Obter perfil
- `PUT /api/auth/perfil` - Atualizar perfil

### Dashboard

- `GET /api/dashboard` - Dados principais
- `GET /api/dashboard/graficos` - Dados para gráficos
- `GET /api/dashboard/atividades` - Atividades recentes

### Usuários

- `GET /api/usuarios` - Listar usuários
- `GET /api/usuarios/:id` - Obter usuário
- `POST /api/usuarios` - Criar usuário (admin)
- `PUT /api/usuarios/:id` - Atualizar usuário (admin)
- `DELETE /api/usuarios/:id` - Deletar usuário (admin)

### Chamados

- `GET /api/chamados` - Listar chamados
- `GET /api/chamados/:id` - Obter chamado
- `POST /api/chamados` - Criar chamado
- `PUT /api/chamados/:id` - Atualizar chamado (admin)
- `DELETE /api/chamados/:id` - Deletar chamado (admin)

### Clientes (CRM)

- `GET /api/clientes` - Listar clientes
- `GET /api/clientes/:id` - Obter cliente
- `POST /api/clientes` - Criar cliente
- `PUT /api/clientes/:id` - Atualizar cliente (admin)
- `DELETE /api/clientes/:id` - Deletar cliente (admin)

### Produtos

- `GET /api/produtos` - Listar produtos
- `GET /api/produtos/:id` - Obter produto
- `POST /api/produtos` - Criar produto (admin)
- `PUT /api/produtos/:id` - Atualizar produto (admin)
- `DELETE /api/produtos/:id` - Deletar produto (admin)

### Pedidos

- `GET /api/pedidos` - Listar pedidos
- `GET /api/pedidos/:id` - Obter pedido
- `POST /api/pedidos` - Criar pedido
- `PUT /api/pedidos/:id` - Atualizar pedido (admin)
- `DELETE /api/pedidos/:id` - Deletar pedido (admin)

### Membros

- `GET /api/membros` - Listar membros
- `GET /api/membros/:id` - Obter membro
- `POST /api/membros` - Criar membro (admin)
- `PUT /api/membros/:id` - Atualizar membro (admin)
- `DELETE /api/membros/:id` - Deletar membro (admin)

## Tecnologias Utilizadas

### Backend
- Express.js
- PostgreSQL (pg)
- JWT (jsonwebtoken)
- Bcrypt (hash de senhas)
- Joi (validação)
- Helmet (segurança)
- Express Rate Limit (limitação de requisições)
- Resend (e-mail transacional)

### Frontend
- React 18
- React Router v6
- Axios (requisições HTTP)
- React Query (gerenciamento de estado)
- React Hook Form (formulários)
- React Hot Toast (notificações)
- Lucide React (ícones)
- Recharts (gráficos)
- Date-fns (formatação de datas)

## E-mail Transacional

O sistema utiliza o **Resend** para envio de e-mails transacionais (boas-vindas, redefinição de senha, convites, faturas). Para configurar:

1. Crie uma conta em [resend.com](https://resend.com)
2. Obtenha sua API key
3. Configure as variáveis no `.env`:
   ```env
   RESEND_API_KEY="re_xxxx"
   EMAIL_FROM="ROTINA <noreply@seu-dominio.com.br>"
   APP_NAME="ROTINA"
   ```
4. **Importante:** Adicione os registros DNS (SPF, DKIM, DMARC) no seu provedor para garantir entrega
5. Consulte o guia completo: [docs/RESEND_DNS_SETUP.md](./RESEND_DNS_SETUP.md)

## Testando o Envio

A API inclui uma rota pública parateste:

```bash
curl -X POST http://localhost:3001/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "seu-email@exemplo.com", "name": "Desenvolvedor"}'
```

Resposta esperada:

```json
{
  "success": true,
  "message": "E-mail de teste enviado com sucesso!",
  "data": { "id": "e227092e-..." }
}
```

## Próximos Passos

- [ ] Implementar upload de imagens
- [ ] Sistema de notificações
- [ ] Relatórios em PDF
- [ ] Módulo de finanças
- [ ] Integração com gateways de pagamento
- [ ] App mobile (React Native)
- [ ] Testes automatizados
- [ ] CI/CD

## Contribuindo

Contribuições são bem-vindas! Por favor, siga estas etapas:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT.

## Suporte

Para questões ou suporte, abra uma issue no repositório.