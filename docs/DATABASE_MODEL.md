# Modelagem de Dados - Multi-Tenancy SaaS

## Arquitetura de Isolamento

### Abordagem: Single Database com Row Isolation

```
┌─────────────────────────────────────────┐
│         PostgreSQL (Shared)             │
│                                         │
│  ┌──────────────┐  ┌──────────────┐    │
│  │   Tenant A   │  │   Tenant B   │    │
│  │  (Empresa 1) │  │  (Empresa 2) │    │
│  └──────────────┘  └──────────────┘    │
│                                         │
│  Isolamento via: tenant_id (UUID)       │
│  em todas as tabelas                    │
└─────────────────────────────────────────┘
```

**Vantagens:**
- ✅ Custo reduzido (um banco para todos)
- ✅ Manutenção simplificada
- ✅ Escalabilidade vertical fácil
- ✅ Backups centralizados

**Desvantagens:**
- ⚠️ Isolamento lógico (não físico)
- ⚠️ Risco de vazamento se mal implementado
- ⚠️ Performance pode degradar com milhões de tenants

### Medidas de Segurança

1. **Middleware OBRIGATÓRIO**: Sempre extrair `tenant_id` do JWT
2. **Nunca confiar no frontend**: Não aceitar `tenant_id` do body/params
3. **Foreign Keys com CASCADE**: Garantir integridade referencial
4. **Índices em tenant_id**: Performance nas consultas

## Schema Prisma Completo

### 1. Tenant (Organização/Empresa)

```prisma
model Tenant {
  id            String    @id @default(uuid())
  name          String    // Nome da empresa
  slug          String    @unique  // URL amigável
  cnpj          String?   @unique
  email         String    @unique
  phone         String?
  address       String?
  plan          String    @default("basic")  // basic, pro, enterprise
  active        Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relacionamentos
  users              User[]
  subscriptions      Subscription[]
  tickets            Ticket[]
  clients            Client[]
  products           Product[]
  orders             Order[]
  memberSubscriptions MemberSubscription[]
  modules            TenantModule[]
}
```

**Campos principais:**
- `slug`: Identificador único para URLs (ex: "minha-empresa")
- `plan`: Tipo de plano (básico, profissional, enterprise)
- `active`: Controle administrativo de acesso

**Funcionalidades:**
- Multi-tenancy baseado em linha
- Isolamento completo por `tenant_id`
- Suporte a features por módulo

---

### 2. User (Usuário do Sistema)

```prisma
model User {
  id             String    @id @default(uuid())
  tenantId       String
  tenant         Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  email          String
  name           String
  password       String    // Hash bcrypt
  role           Role      @default(MEMBER)  // RBAC
  avatarUrl      String?
  emailVerified  Boolean   @default(false)
  active         Boolean   @default(true)
  lastLogin      DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // Relacionamentos
  tickets              Ticket[]
  memberSubscriptions  MemberSubscription[]
  onlineSessions       OnlineSession[]

  @@unique([tenantId, email])
  @@index([tenantId])
  @@index([email])
}
```

**Segurança:**
- Senha sempre armazenada com hash (bcrypt/argon2)
- `emailVerified`: Controle de conta ativa
- `active`: Soft delete / desativação administrativa

**RBAC (Role-Based Access Control):**
- `ADMIN`: Acesso total
- `MANAGER`: Gestão operacional
- `MEMBER`: Usuário básico

---

### 3. Subscription (Assinatura - Integração Stripe)

```prisma
model Subscription {
  id                    String             @id @default(uuid())
  tenantId              String             @unique
  tenant                Tenant             @relation(fields: [tenantId], references: [id])
  stripeCustomerId      String?            @unique
  stripeSubscriptionId  String?            @unique
  status                SubscriptionStatus @default(INCOMPLETE)
  planId                String             // "starter", "pro", "enterprise"
  currentPeriodEnd      DateTime
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  @@index([stripeCustomerId])
  @@index([stripeSubscriptionId])
}

enum SubscriptionStatus {
  ACTIVE      // Ativa e paga
  PAST_DUE    // Pagamento atrasado
  CANCELED    // Cancelada
  INCOMPLETE  // Início de onboarding
}
```

**Fluxo de Onboarding:**
```
1. Criação do Tenant
   ↓
2. Tenant criado com status INCOMPLETE
   ↓
3. Redirecionamento para Stripe Checkout
   ↓
4. Stripe confirma pagamento
   ↓
5. Webhook atualiza status para ACTIVE
   ↓
6. Tenant pode usar o sistema
```

**Campos importantes:**
- `stripeCustomerId`: ID do cliente no Stripe
- `stripeSubscriptionId`: ID da assinatura no Stripe
- `currentPeriodEnd`: Data de renovação
- `planId`: Plano contratado (mapear preços no Stripe)

---

### 4. MemberSubscription (Histórico de Assinaturas)

```prisma
model MemberSubscription {
  id           String    @id @default(uuid())
  tenantId     String
  tenant       Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  userId       String
  user         User      @relation(fields: [userId], references: [id])
  planType     String
  startDate    DateTime  @db.Date
  endDate      DateTime? @db.Date
  monthlyValue Decimal?
  status       String    @default("active")
  createdAt    DateTime  @default(now())

  @@index([tenantId])
  @@index([userId])
}
```

**Diferença do Subscription:**
- `Subscription`: Assinatura atual do tenant (pagamento)
- `MemberSubscription`: Histórico de planos dos usuários

**Uso:**
- Controle de acesso baseado em plano
- Histórico de upgrades/downgrades
- Relatórios de MRR (Monthly Recurring Revenue)

---

### 5. Ticket (Chamados/Support)

```prisma
model Ticket {
  id          String    @id @default(uuid())
  tenantId    String
  tenant      Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  title       String
  description String?
  category    String?
  priority    String    @default("medium")
  status      String    @default("open")
  openedAt    DateTime  @default(now())
  closedAt    DateTime?
  updatedAt   DateTime  @updatedAt

  @@index([tenantId])
  @@index([userId])
}
```

**Campos:**
- `priority`: low, medium, high, urgent
- `status`: open, in_progress, resolved, closed
- `category`: Tipo de chamado (bug, feature, dúvida)

---

### 6. Client (CRM - Clientes)

```prisma
model Client {
  id                 String    @id @default(uuid())
  tenantId           String
  tenant             Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name               String
  cpfCnpj            String?
  email              String?
  phone              String?
  address            String?
  status             String    @default("active")
  origin             String?   // Como conheceu (google, indicação, etc)
  firstPurchaseDate  DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  orders             Order[]

  @@index([tenantId])
  @@index([cpfCnpj])
}
```

**Funcionalidades:**
- Controle de clientes para CRM
- Rastreamento de origem de cadastro
- Integração com pedidos

---

### 7. Product (E-commerce - Produtos)

```prisma
model Product {
  id          String    @id @default(uuid())
  tenantId    String
  tenant      Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name        String
  description String?
  price       Decimal   @db.Decimal(10, 2)
  stock       Int       @default(0)
  category    String?
  imageUrl    String?
  active      Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  orderItems  OrderItem[]

  @@index([tenantId])
}
```

**Características:**
- Preço em Decimal para precisão financeira
- Controle de estoque simples
- Categorização opcional

---

### 8. Order + OrderItem (Pedidos)

```prisma
model Order {
  id           String    @id @default(uuid())
  tenantId     String
  tenant       Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  clientId     String
  client       Client    @relation(fields: [clientId], references: [id])
  status       String    @default("pending")
  totalAmount  Decimal   @db.Decimal(10, 2)
  orderDate    DateTime  @default(now())
  paymentDate  DateTime?
  shippingDate DateTime?
  deliveryDate DateTime?

  items        OrderItem[]

  @@index([tenantId])
  @@index([clientId])
}

model OrderItem {
  id        String  @id @default(uuid())
  orderId   String
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId String
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int
  price     Decimal @db.Decimal(10, 2)

  @@index([orderId])
  @@index([productId])
}
```

**Fluxo de pedido:**
1. Cliente seleciona produtos
2. Criação do Order com status "pending"
3. OrderItems são criados (snapshot de preço)
4. Confirmação de pagamento atualiza status

---

### 9. TenantModule (Módulos por Tenant)

```prisma
model TenantModule {
  id            String    @id @default(uuid())
  tenantId      String
  tenant        Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  module        String    // "dashboard", "chamados", "crm", "ecommerce"
  active        Boolean   @default(true)
  activatedAt   DateTime  @default(now())
  deactivatedAt DateTime?
  createdAt     DateTime  @default(now())

  @@unique([tenantId, module])
  @@index([tenantId])
}
```

**Uso:**
- Controle de features por plano
- Ativação/desativação dinâmica de módulos
- Validação no middleware antes de acessar rotas

---

### 10. OnlineSession (Sessões Ativas)

```prisma
model OnlineSession {
  id           String    @id @default(uuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenantId     String
  tenant       Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  token        String    @unique
  loginAt      DateTime  @default(now())
  lastActivity DateTime  @default(now())

  @@index([token])
  @@index([userId])
  @@index([tenantId])
}
```

**Propósito:**
- Rastrear usuários logados
- Dashboard de usuários online
- Invalidação de sessão (logout)

---

## Índices e Performance

### Índices Criados Automaticamente

```sql
-- Chaves primárias (automáticas)
id em todas as tabelas

-- Chaves únicas
usuarios (tenant_id, email) UNIQUE
tenants (slug, email, cnpj) UNIQUE
subscriptions (stripe_customer_id, stripe_subscription_id) UNIQUE
online_sessions (token) UNIQUE

-- Índices de performance (consultas frequentes)
idx_usuarios_tenant ON usuarios(tenant_id)
idx_chamados_tenant ON chamados(tenant_id)
idx_clientes_tenant ON clientes(tenant_id)
idx_produtos_tenant ON produtos(tenant_id)
idx_pedidos_tenant ON pedidos(tenant_id)
idx_membros_tenant ON membros(tenant_id)
```

**Por que esses índices?**
- Todas as consultas filtram por `tenant_id` primeiro
- Melhora performance em queries com JOINs
- Reduz tempo de resposta em dashboards

---

## Integridade Referencial

### CASCADE DELETE Implementation

```prisma
Tenant {
  // Quando um tenant é deletado, deleta CASCATA:
  - usuarios
  - tickets
  - clientes
  - produtos
  - pedidos
  - subscriptions
  - modules
}
```

**Benefício:** Dados órfãos nunca existem

---

## Migração do Schema SQL Existente

### Mapeamento SQL → Prisma

```sql
-- SQL Original
CREATE TABLE usuarios (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome VARCHAR(255),
  email VARCHAR(255)
);

-- Prisma Schema
model User {
  id        String   @id @default(uuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name      String
  email     String

  @@unique([tenantId, email])
  @@index([tenantId])
}
```

### Tipos de Dados

| SQL                  | Prisma              | Observação                        |
|---------------------|---------------------|-----------------------------------|
| `UUID`              | `String @default(uuid())` | Prisma gerencia UUIDs           |
| `VARCHAR(255)`      | `String`            | Tamanho não obrigatório           |
| `TEXT`              | `String`            | Texto longo                       |
| `DECIMAL(10,2)`     | `Decimal @db.Decimal(10, 2)` | Precisão financeira          |
| `INTEGER`           | `Int`               | Inteiro                           |
| `BOOLEAN`           | `Boolean`           | Verdadeiro/Falso                  |
| `TIMESTAMP`         | `DateTime`          | Data e hora                       |
| `DATE`              | `DateTime @db.Date` | Apenas data                       |
| `JSONB`             | `Json`              | Dados flexíveis                   |

---

## Segurança e Validação

### Regra #1: Tenant ID Nunca do Frontend

```javascript
// ❌ NUNCA FAZER ISSO
app.post('/clientes', async (req, res) => {
  const { tenant_id, ...data } = req.body;
  // ... criar cliente com esse tenant_id
});

// ✅ SEMPRE FAZER ISSO
app.post('/clientes', authenticateToken, async (req, res) => {
  const tenantId = req.user.tenantId; // Extraído do JWT
  const { ...data } = req.body;
  // ... criar cliente com tenantId do JWT
});
```

### Regra #2: Middleware Obrigatório

```javascript
// Aplicar em TODAS as rotas que acessam dados
router.use('/clientes', authenticateToken, validateTenantAccess);

// validateTenantAccess valida que req.user.tenantId existe
// e está ativo antes de permitir acesso
```

### Regra #3: Filtro Sempre Presente

```javascript
// Toda query DEVE incluir tenant_id
const clientes = await prisma.client.findMany({
  where: {
    tenantId: req.user.tenantId, // OBRIGATÓRIO
    // ... filtros adicionais
  }
});
```

---

## Queries Comuns

### Buscar tenants ativos
```javascript
const tenants = await prisma.tenant.findMany({
  where: { active: true },
  select: {
    id: true,
    name: true,
    slug: true,
    plan: true,
    _count: {
      select: { users: true }
    }
  }
});
```

### Dashboard do tenant
```javascript
const dashboard = await prisma.tenant.findUnique({
  where: { id: tenantId },
  include: {
    _count: {
      select: {
        users: true,
        clients: true,
        tickets: true,
        orders: true
      }
    },
    subscription: true,
    modules: {
      where: { active: true }
    }
  }
});
```

### Estatísticas de chamados
```javascript
const stats = await prisma.ticket.groupBy({
  by: ['status'],
  where: {
    tenantId: tenantId,
    openedAt: {
      gte: startOfMonth,
      lte: endOfMonth
    }
  },
  _count: {
    id: true
  }
});
```

---

## Escalabilidade Futura

### Opção 1: Database per Tenant (High Scale)

```
┌──────────────┐  ┌──────────────┐
│  Tenant A    │  │  Tenant B    │
│  Database A  │  │  Database B  │
└──────────────┘  └──────────────┘
```

- Isolamento físico total
- Custo maior
- Backup por cliente

### Opção 2: Schema per Tenant (Medium Scale)

```sql
CREATE SCHEMA tenant_abc;
SET search_path TO tenant_abc;
-- Tabelas criadas no schema isolado
```

- Meio termo entre custo e isolamento
- PostgreSQL RLS nativo

### Opção 3: Row Level Security (PostgreSQL)

```sql
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON clientes
  USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

- Isolamento no banco de dados
- Não confiar na aplicação
- Performance overhead mínimo

---

## Comandos Prisma

```bash
# Instalar Prisma
npm install prisma --save-dev
npm install @prisma/client

# Inicializar
npx prisma init

# Gerar cliente
npx prisma generate

# Criar migration
npx prisma migrate dev --name init

# Aplicar em produção
npx prisma migrate deploy

# Ver dados
npx prisma studio
```

## Próximos Passos

1. [ ] Instalar Prisma no projeto
2. [ ] Configurar DATABASE_URL
3. [ ] Executar primeira migration
4. [ ] Atualizar middleware auth.js para usar Prisma
5. [ ] Migrar controllers para Prisma Client
6. [ ] Adicionar validação de módulos no middleware
7. [ ] Implementar Stripe webhooks
8. [ ] Testes de integração multi-tenant

## Referências

- [Prisma Multi-tenant Guide](https://www.prisma.io/docs/guides/multi-tenant)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)