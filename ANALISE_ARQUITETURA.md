# Análise de Arquitetura e Recomendações

## 📊 Análise da Situação Atual

### Stack Tecnológica Atual
- **Backend**: Node.js + Express (JavaScript)
- **Frontend**: React 18 + Vite (JavaScript)
- **Banco de Dados**: PostgreSQL
- **Autenticação**: JWT com bcrypt
- **Estado Frontend**: React Context + React Query

### Pontos Positivos Atuais ✅
1. **PostgreSQL**: Excelente escolha para SaaS multi-tenant
2. **Multi-tenancy**: Implementado corretamente com isolamento por tenant_id
3. **Segurança**: Helmet, rate-limiting, CORS configurado
4. **Autenticação**: JWT com sessões online e validação
5. **Schema**: Structure bem normalizada com índices e triggers
6. **Organização**: Separação clara de controllers, routes, middleware

### Limitações Atuais ⚠️
1. **Sem tipagem**: JavaScript puro (sem TypeScript)
2. **Arquitetura**: Express sem estrutura opinativa (falta de padrões)
3. **Validação**: Uso básico de joi/express-validator (não utilizado consistentemente)
4. **ORM**: Queries SQL puras (sem Prisma/Drizzle)
5. **Testes**: Ausência de testes automatizados
6. **Logs**: Apenas console.log (sem Winston/Pino)
7. **Validação de tenant**: Middleware existe mas não é usado em todas as rotas

## 🎯 Recomendações Estratégicas

Baseado nas necessidades de um sistema SaaS empresarial ERP/CRM e nas opções fornecidas, seguem as recomendações:

### Opção 1: Node.js + NestJS + TypeScript (✅ RECOMENDADA)

**Por que escolher esta opção:**
- Mesma linguagem no front e back (TypeScript)
- Tipagem ponta a ponta (backend → frontend)
- Arquitetura opinativa e escalável
- Excelente ecossistema para ERP/CRM
- Performance similar ao Express

**Benefícios específicos:**
1. **TypeScript nativo**: Tipagem forte em todo o projeto
2. **Arquitetura modular**: Modules, Controllers, Services, DTOs
3. **Injeção de dependência**: Código mais testável e maintainable
4. **Decorators**: Validação automática com class-validator
5. **ORM built-in**: Suporte nativo a TypeORM e Prisma
6. **Documentação automática**: Swagger com @nestjs/swagger
7. **Multi-tenant facilitado**: Guards e interceptors
8. **CQRS opcional**: Para operações complexas

**Stack completa recomendada:**

### Backend
- NestJS + TypeScript
- Prisma ou Drizzle (ORM)
- PostgreSQL (já em uso)
- JWT + Passport
- class-validator + class-transformer
- @nestjs/swagger (documentação)
- Winston (logs estruturados)

### Frontend
- **Base**: React 18 + Vite + TypeScript
- **Interface & UI**: Shadcn UI + Tailwind CSS
  - Componentes acessíveis e customizáveis
  - Design system consistente
  - Pronto para uso corporativo
- **Autenticação**: Clerk ou Auth.js (NextAuth) / Supabase Auth
  - Login social habilitado
  - MFA (Multi-Factor Authentication)
  - RBAC (Role-Based Access Control)
- **Tabelas de Dados**: TanStack Table (React Table v8)
  - Filtros, paginação e ordenação avançados
  - Essencial para ERPs/CRMs com visualização intensiva
- **Formulários**: React Hook Form + Zod
  - Validação rigorosa no frontend
  - Reutilização de schemas (compartilhados com backend)
- **Gráficos**: Recharts ou Tremor
  - Dashboards interativos
  - Visualização de métricas
- **Requisições HTTP**: Axios (já em uso) ou TanStack Query (React Query v5)
- **Estado**: Zustand ou Jotai (alternativa mais leve ao Context)

### Opção 2: Python + FastAPI

**Quando escolher esta opção:**
- Se o SaaS envolver IA/ML
- Processamento de dados pesado em background
- Automações e integrações complexas

**Benefícios:**
1. **Performance**: Uma das frameworks Python mais rápidas
2. **Tipagem**: Type hints nativos do Python 3.6+
3. **Documentação automática**: Swagger/OpenAPI built-in
4. **Validação**: Pydantic para validação de dados
5. **Async/await**: Excelente suporte a operações assíncronas
6. **Ecossistema IA**: Integração nativa com pandas, numpy, scikit-learn

## 📋 Plano de Migração (Node.js + NestJS)

### Fase 1: Preparação (Semana 1)
1. **Setup do projeto NestJS**
   - Criar estrutura de pastas
   - Configurar TypeScript
   - Configurar Prisma com schema existente
   - Configurar variáveis de ambiente

2. **Migração do banco de dados**
   - Mantém o schema.sql atual
   - Criar Prisma schema baseado no SQL existente
   - Testar conexão

### Fase 2: Core (Semanas 2-3)
1. **Módulo de Autenticação**
   - DTOs para login/registro
   - Services com lógica de negócio
   - Guards JWT
   - Estratégias Passport
   - Migrar controllers existentes

2. **Módulo de Tenants**
   - TenantResolver para multi-tenancy
   - Middleware/Interceptor para isolamento

### Fase 3: Módulos de Negócio (Semana 4)
1. **Migrar controllers existentes:**
   - Dashboard
   - Usuários
   - Chamados
   - Clientes
   - Produtos
   - Pedidos
   - Membros

2. **Adicionar validação robusta:**
   - class-validator em todos DTOs
   - Pipes globais

### Fase 4: Melhorias (Semana 5)
1. **Logs estruturados** (Winston)
2. **Testes automatizados** (Jest)
3. **Documentação Swagger**
4. **Exception filters**
5. **Rate limiting avançado**
6. **Cache** (Redis)

### Fase 5: Frontend (Semana 6)
1. **Migrar para TypeScript**
2. **Criar tipos compartilhados** (ou usar tRPC)
3. **Atualizar serviços API**
4. **Melhorar validação de forms** (Zod schemas)

## 🔧 Comparação Técnica

| Aspecto | Node.js + NestJS | Python + FastAPI |
|---------|------------------|------------------|
| **Tipagem** | TypeScript (forte) | Type hints (médio) |
| **Performance** | ⚡⚡⚡⚡ | ⚡⚡⚡⚡⚡ |
| **Ecossistema** | npm (imenso) | PyPI (imenso) |
| **Curva aprendizado** | Média (se já usa TS) | Baixa (se sabe Python) |
| **Multi-tenant** | Nativo com Guards | Custom implementation |
| **Documentação** | Swagger (@nestjs/swagger) | Swagger (built-in) |
| **Validação** | class-validator | Pydantic |
| **ORM** | TypeORM/Prisma | SQLAlchemy |
| **IA/ML** | ❌ Limitado | ✅ Excelente |
| **Manutenibilidade** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## 💡 Recomendação Final

### Para Este Projeto: **Node.js + NestJS + TypeScript**

**Justificativa:**
1. **Continuidade**: Mantém o stack JavaScript/TypeScript
2. **Produtividade**: Equipe já conhece Node.js
3. **Tipagem ponta a ponta**: TypeScript no front e back
4. **Escalabilidade**: Arquitetura preparada para crescimento
5. **Manutenibilidade**: Padrões e estrutura clara
6. **Performance**: Suficiente para ERP/CRM

**Considerações futuras:**
- Se houver necessidade de processamento de IA/ML pesado, considerar microserviços em Python/FastAPI
- Manter PostgreSQL como banco principal
- Considerar Redis para cache e sessões

## 🛠️ Estrutura de Bibliotecas Frontend (Kit de Sobrevivência SaaS)

Para painéis administrativos, ERPs e CRMs, utilize bibliotecas testadas em vez de reinventar a roda:

### 1. Interface & UI
**Shadcn UI + Tailwind CSS**
- Componentes acessíveis e totalmente customizáveis
- Design system consistente para aplicações corporativas
- Prontos para uso em ERPs/CRMs
- Suporte a temas claro/escuro

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 2. Tabelas de Dados Avançadas
**TanStack Table (React Table v8)**
- Essencial para ERPs/CRMs com visualização intensiva de dados
- Filtros, ordenação e paginação avançadas
- Seleção em massa e exportação
- Virtualização para性能 com grandes volumes

```bash
npm install @tanstack/react-table
```

**Exemplo de implementação:**
```typescript
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel } from '@tanstack/react-table';

const table = useReactTable({
  data: usuarios,
  columns: columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
});
```

### 3. Formulários & Validação
**React Hook Form + Zod**
- Validação rigorosa no frontend
- Reutilização de schemas (compartilhados com backend NestJS)
- Performance otimizada (minimal re-renders)

```bash
npm install react-hook-form @hookform/resolvers zod
```

**Exemplo com Zod:**
```typescript
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const usuarioSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  cargo: z.enum(['admin', 'user', 'master']),
});

type UsuarioForm = z.infer<typeof usuarioSchema>;

const { register, handleSubmit, formState: { errors } } = useForm<UsuarioForm>({
  resolver: zodResolver(usuarioSchema)
});
```

### 4. Gráficos & Dashboards
**Recharts ou Tremor**
- Dashboards interativos para métricas de negócio
- Visualização de dados em tempo real
- Componentes pré-construídos para ERPs

```bash
npm install recharts
# ou
npm install @tremor/react
```

**Exemplo com Recharts:**
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const dados = [
  { name: 'Jan', vendas: 4000 },
  { name: 'Fev', vendas: 3000 },
  { name: 'Mar', vendas: 5000 },
];

<LineChart width={600} height={300} data={dados}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Line type="monotone" dataKey="vendas" stroke="#8884d8" />
</LineChart>
```

### 5. Autenticação & Autorização
**Clerk ou Auth.js (NextAuth) / Supabase Auth**
- Login social (Google, GitHub, Microsoft)
- MFA (Multi-Factor Authentication)
- RBAC (Role-Based Access Control)
- Gerenciamento de sessões
- Pronto para produção

```bash
# Clerk
npm install @clerk/clerk-react

# ou Supabase Auth
npm install @supabase/auth-ui-react @supabase/auth-ui-shared

# ou Auth.js
npm install next-auth
```

**Exemplo com Clerk:**
```tsx
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react';

function App() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <SignedIn>
        <Dashboard />
      </SignedIn>
      <SignedOut>
        <Login />
      </SignedOut>
    </ClerkProvider>
  );
}
```

### 6. Requisições HTTP & Estado
**TanStack Query (React Query v5) + Axios**
- Cache inteligente de requisições
- Sincronização em tempo real
- Retry automático e deduplicação
- Estados de loading/error/success

```bash
npm install @tanstack/react-query axios
```

**Configuração:**
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 2,
    },
  },
});

// No App.tsx
<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

### 7. Gerenciamento de Estado Global
**Zustand ou Jotai**
- Alternativa leve e moderna ao Context API
- Menos boilerplate
- Performance otimizada

```bash
npm install zustand
```

**Exemplo com Zustand:**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthStore {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: 'auth-storage' }
  )
);
```

### 8. Animações & Transições
**Framer Motion**
- Animações suaves e profissionais
- Transições de página
- Micro-interações

```bash
npm install framer-motion
```

## 📂 Estrutura de Pastas Frontend Recomendada

```
frontend/src/
├── components/
│   ├── ui/                    # Componentes Shadcn UI
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   └── dialog.tsx
│   ├── layout/                # Componentes de layout
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── MainLayout.tsx
│   ├── forms/                 # Formulários reutilizáveis
│   │   ├── UsuarioForm.tsx
│   │   └── ChamadoForm.tsx
│   └── tables/                # Tabelas genéricas
│       ├── DataTable.tsx
│       └── ColumnDef.tsx
├── pages/                     # Páginas/rotas
├── hooks/                     # Custom hooks
│   ├── useAuth.ts
│   └── useApi.ts
├── services/                  # Serviços API
│   ├── api.ts                 # Axios configurado
│   ├── auth.service.ts
│   └── usuarios.service.ts
├── stores/                    # Zustand stores
│   ├── auth.store.ts
│   └── ui.store.ts
├── schemas/                   # Schemas Zod (compartilhados)
│   ├── usuario.schema.ts
│   └── chamado.schema.ts
├── types/                     # TypeScript interfaces
│   ├── usuario.ts
│   └── chamado.ts
├── utils/                     # Funções utilitárias
│   ├── formatters.ts
│   └── validators.ts
├── contexts/                  # React Contexts (se necessário)
└── lib/                       # Configurações
    └── utils.ts
```

## 🚀 Exemplo de Componente Completo (ERP/CRM)

```tsx
// components/tables/usuarios-table.tsx
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usuarioService } from '@/services/usuarios.service';
import { useAuthStore } from '@/stores/auth.store';

export function UsuariosTable() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuthStore();
  
  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['usuarios', tenantId],
    queryFn: () => usuarioService.listar(tenantId!),
  });

  const columns = [
    {
      accessorKey: 'nome',
      header: 'Nome',
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'cargo',
      header: 'Cargo',
    },
  ];

  const table = useReactTable({
    data: usuarios || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Usuários</h2>
        <Button><Plus className="mr-2 h-4 w-4" /> Novo Usuário</Button>
      </div>
      
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="p-2 text-left">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

## 🔗 Tipagem Ponta a Ponta (Backend ↔ Frontend)

Para garantir consistência total entre backend e frontend, utilize TypeScript em ambos e compartilhe tipos:

### Opção 1: Tipos Compartilhados (monorepo)

```
projeto/
├── packages/
│   ├── shared/           # Tipos compartilhados
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── usuario.ts
│   │   │   │   ├── chamado.ts
│   │   │   │   └── cliente.ts
│   │   │   └── schemas/
│   │   │       ├── usuario.schema.ts
│   │   │       └── validators.ts
│   │   └── package.json
│   ├── backend/          # NestJS
│   └── frontend/         # React
```

```typescript
// packages/shared/src/types/usuario.ts
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  cargo: 'master' | 'admin' | 'gerente' | 'operador' | 'leitor';
  tenant: {
    id: string;
    nome: string;
    plano: string;
  };
  permissoes: string[];
  ativo: boolean;
}

export interface CreateUsuarioDTO {
  nome: string;
  email: string;
  senha: string;
  cargo?: string;
}

export interface LoginDTO {
  email: string;
  senha: string;
}

export interface AuthResponse {
  access_token: string;
  usuario: Usuario;
}
```

### Opção 2: tRPC (Type-Safe API)

```bash
# Backend
npm install @trpc/server @trpc/client @trpc/react-query @trpc/next
```

```typescript
// backend/src/trpc/context.ts
import * as trpc from '@trpc/server';
import * as trpcNext from '@trpc/server/adapters/next';
import { PrismaService } from 'nestjs-prisma';

export async function createContext(opts?: trpcNext.CreateNextContextOptions) {
  // Extrair token do header
  const token = opts?.req.headers.authorization?.replace('Bearer ', '');
  
  // Buscar usuário (similar ao authenticateToken)
  // ...
  
  return {
    prisma: new PrismaService(),
    user: usuario, // se autenticado
  };
}

export type Context = trpc.inferAsyncReturnType<typeof createContext>;

// backend/src/trpc/routers/auth.ts
import * as trpc from '@trpc/server';
import { Context } from '../context';
import { z } from 'zod';

export const authRouter = trpc.router<Context>()
  .route('login', {
    input: z.object({
      email: z.string().email(),
      senha: z.string().min(6),
    }),
    resolve: async ({ input, ctx }) => {
      // Lógica de login
      return { access_token: '...', usuario: { ... } };
    }
  })
  .route('perfil', {
    resolve: async ({ ctx }) => {
      return ctx.user;
    },
  });
```

```typescript
// frontend/src/lib/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/routers/_app';

export const trpc = createTRPCReact<AppRouter>();
```

```typescript
// frontend/src/hooks/useAuth.ts
import { trpc } from '@/lib/trpc';

export function useLogin() {
  return trpc.auth.login.useMutation({
    onSuccess: (data) => {
      // Tipagem automática!
      console.log(data.usuario.nome); // ✅ TypeScript sabe que existe
      console.log(data.access_token); // ✅ TypeScript sabe que existe
    },
  });
}

// Uso no componente
function LoginPage() {
  const login = useLogin();
  
  const onSubmit = async (values: LoginDTO) => {
    await login.mutateAsync(values);
  };
}
```

### Opção 3: OpenAPI + Gerador de Tipos (alternativa)

```bash
# Gerar tipos a partir do OpenAPI
npm install -D openapi-typescript-codegen
```

```yaml
# Gerar tipos
npx openapi-typescript-codegen --input http://localhost:3001/api/docs-json --output src/api/client
```

```typescript
// src/api/client/usuarios.router.ts (gerado automaticamente)
export type UsuariosRouterOptions = {};

export type GetUsuariosResponse = {
  data: Usuario[];
  total: number;
};

// Uso com tipagem total
import { usuariosApi } from '@/api/client';

const { data } = await usuariosApi.getUsuarios();
// data é tipado automaticamente!
```

### Zod para Validação Compartilhada

```typescript
// packages/shared/src/schemas/usuario.schema.ts
import { z } from 'zod';

export const usuarioSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().min(3).max(255),
  email: z.string().email(),
  cargo: z.enum(['master', 'admin', 'gerente', 'operador', 'leitor']),
  ativo: z.boolean(),
  tenant: z.object({
    id: z.string().uuid(),
    nome: z.string(),
    plano: z.string(),
  }),
  permissoes: z.array(z.string()),
});

export type Usuario = z.infer<typeof usuarioSchema>;

export const createUsuarioSchema = z.object({
  nome: z.string().min(3).max(255),
  email: z.string().email(),
  senha: z.string().min(6).max(100),
  cargo: z.enum(['master', 'admin', 'gerente', 'operador', 'leitor']).default('user'),
});

export type CreateUsuarioDTO = z.infer<typeof createUsuarioSchema>;
```

```typescript
// Backend (NestJS)
import { createUsuarioSchema } from '@saas/shared';

@Post()
@UsePipes(new ZodValidationPipe(createUsuarioSchema))
async criar(@Body() data: CreateUsuarioDTO) {
  // data está validado e tipado!
}
```

```typescript
// Frontend
import { createUsuarioSchema, type CreateUsuarioDTO } from '@saas/shared';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const { register, handleSubmit } = useForm<CreateUsuarioDTO>({
  resolver: zodResolver(createUsuarioSchema),
});
```

## 🏗️ Arquitetura para SaaS Corporativo

Quatro pilares fundamentais que devem ser implementados desde o início:

### 1. Multi-tenancy (Multi-inquilino) ✅ JÁ IMPLEMENTADO

**Abordagem atual**: Single Database com `tenant_id` em todas as tabelas
- Mais simples de gerenciar
- Custo menor de infraestrutura
- Isolamento lógico (não físico)

**Implementação atual:**
```sql
-- Schema exemplifica a abordagem
CREATE TABLE usuarios (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- ... outros campos
);
```

**Para o futuro (Escala)**: 
- **Database per Tenant**: Cada empresa tem seu próprio banco (custo maior, isolamento total)
- **Schema per Tenant**: Cada tenant em um schema PostgreSQL separado
- **Row Level Security (RLS)**: PostgreSQL RLS para isolamento automático

### 2. Gerenciamento de Permissões (RBAC) ⚠️ PARCIALMENTE IMPLEMENTADO

**Status atual**: Apenas cargos básicos (master, admin, user)

**Evolução recomendada:**

```typescript
// Backend - Enum de permissões
enum Permissao {
  // Dashboard
  DASHBOARD_VIEW = 'dashboard:view',
  DASHBOARD_EDIT = 'dashboard:edit',
  
  // Usuários
  USUARIOS_VIEW = 'usuarios:view',
  USUARIOS_CREATE = 'usuarios:create',
  USUARIOS_EDIT = 'usuarios:edit',
  USUARIOS_DELETE = 'usuarios:delete',
  
  // Chamados
  CHAMADOS_VIEW = 'chamados:view',
  CHAMADOS_CREATE = 'chamados:create',
  CHAMADOS_EDIT = 'chamados:edit',
  CHAMADOS_DELETE = 'chamados:delete',
  
  // CRM
  CLIENTES_VIEW = 'clientes:view',
  CLIENTES_CREATE = 'clientes:create',
  CLIENTES_EDIT = 'clientes:edit',
  CLIENTES_DELETE = 'clientes:delete',
  
  // E-commerce
  PRODUTOS_VIEW = 'produtos:view',
  PRODUTOS_CREATE = 'produtos:create',
  PRODUTOS_EDIT = 'produtos:edit',
  PRODUTOS_DELETE = 'produtos:delete',
  PEDIDOS_VIEW = 'pedidos:view',
  PEDIDOS_CREATE = 'pedidos:create',
  
  // Financeiro
  FINANCEIRO_VIEW = 'financeiro:view',
  FINANCEIRO_EDIT = 'financeiro:edit',
  
  // Administrativo
  ADMIN_TENANT = 'admin:tenant',
  ADMIN_USUARIOS = 'admin:usuarios',
  ADMIN_CONFIG = 'admin:config',
}

// Roles pré-definidas
enum Role {
  MASTER = 'master',      // Acesso total
  ADMIN = 'admin',        // Gestão operacional
  GERENTE = 'gerente',    // Gestão de equipe
  OPERADOR = 'operador',  // Operação básica
  LEITOR = 'leitor',      // Apenas visualização
}

// Mapeamento Role → Permissões
const ROLE_PERMISSIONS: Record<Role, Permissao[]> = {
  [Role.MASTER]: Object.values(Permissao), // Todas permissões
  [Role.ADMIN]: [
    Permissao.DASHBOARD_VIEW,
    Permissao.USUARIOS_VIEW, Permissao.USUARIOS_CREATE, Permissao.USUARIOS_EDIT,
    Permissao.CHAMADOS_VIEW, Permissao.CHAMADOS_CREATE, Permissao.CHAMADOS_EDIT,
    Permissao.CLIENTES_VIEW, Permissao.CLIENTES_CREATE, Permissao.CLIENTES_EDIT,
    Permissao.PRODUTOS_VIEW, Permissao.PRODUTOS_CREATE, Permissao.PRODUTOS_EDIT,
    Permissao.PEDIDOS_VIEW, Permissao.PEDIDOS_CREATE,
  ],
  [Role.GERENTE]: [
    Permissao.DASHBOARD_VIEW,
    Permissao.CHAMADOS_VIEW, Permissao.CHAMADOS_EDIT,
    Permissao.CLIENTES_VIEW, Permissao.CLIENTES_EDIT,
    Permissao.PRODUTOS_VIEW, Permissao.PRODUTOS_EDIT,
    Permissao.PEDIDOS_VIEW,
  ],
  [Role.OPERADOR]: [
    Permissao.DASHBOARD_VIEW,
    Permissao.CHAMADOS_VIEW, Permissao.CHAMADOS_CREATE,
    Permissao.CLIENTES_VIEW, Permissao.CLIENTES_CREATE,
  ],
  [Role.LEITOR]: [
    Permissao.DASHBOARD_VIEW,
    Permissao.CHAMADOS_VIEW,
    Permissao.CLIENTES_VIEW,
    Permissao.PRODUTOS_VIEW,
    Permissao.PEDIDOS_VIEW,
  ],
};
```

**Schema do banco (avançado):**
```sql
-- Tabela de permissões
CREATE TABLE permissoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  codigo VARCHAR(100) NOT NULL,
  descricao TEXT,
  UNIQUE(tenant_id, codigo)
);

-- Tabela de roles
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  UNIQUE(tenant_id, nome)
);

-- Tabela de permissões por role (N:N)
CREATE TABLE role_permissoes (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permissao_id UUID NOT NULL REFERENCES permissoes(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permissao_id)
);

-- Atualizar tabela de usuários para usar role_id
ALTER TABLE usuarios ADD COLUMN role_id UUID REFERENCES roles(id);
```

**Frontend (componente de proteção):**
```tsx
import { useAuthStore } from '@/stores/auth.store';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: Permissao[];
}

export function ProtectedRoute({ children, requiredPermissions = [] }: ProtectedRouteProps) {
  const { user, permissions } = useAuthStore();
  
  if (!user) return <Navigate to="/login" />;
  
  // Verificar se tem todas as permissões necessárias
  const hasPermission = requiredPermissions.every(permission => 
    permissions.includes(permission)
  );
  
  if (!hasPermission) {
    return <div className="p-6">Acesso negado</div>;
  }
  
  return <>{children}</>;
}
```

### 3. Tratamento de Tarefas Assíncronas (Background Jobs)

**Problema**: Envio de e-mails, relatórios pesados, integração com gateways de pagamento

**Solução**: BullMQ + Redis

```bash
npm install bullmq ioredis
```

**Exemplo de implementação:**

```typescript
// backend/src/queues/email.queue.ts
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

// Configuração da fila
const redisConnection = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

export const emailQueue = new Queue('emails', { connection: redisConnection });

// Tipos de jobs
interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}

// Adicionar job à fila
export async function addEmailJob(data: EmailJobData) {
  await emailQueue.add('send-email', data, {
    attempts: 3, // Tentar 3 vezes em caso de falha
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
}

// Worker (processar jobs)
const worker = new Worker<EmailJobData>('emails', async (job: Job<EmailJobData>) => {
  const { to, subject, template, context } = job.data;
  
  // Lógica de envio de e-mail
  await sendEmail({ to, subject, template, context });
  
}, { connection: redisConnection });

// Uso no controller
async function enviarNotificacaoChamado(chamadoId: string) {
  const chamado = await buscarChamado(chamadoId);
  
  // Adicionar à fila (não bloqueia a API)
  await addEmailJob({
    to: chamado.cliente.email,
    subject: `Chamado #${chamado.id} atualizado`,
    template: 'chamado-atualizado',
    context: { chamado },
  });
}
```

**Jobs comuns em SaaS:**

```typescript
// Tipos de jobs
export enum JobType {
  EMAIL = 'email',
  RELATORIO = 'relatorio',
  PAGAMENTO = 'pagamento',
  NOTIFICACAO = 'notificacao',
  IMPORTACAO = 'importacao',
}

// Exemplo: Relatório pesado
export async function addRelatorioJob(data: {
  tenantId: string;
  tipo: 'vendas' | 'clientes' | 'financeiro';
  filtros: any;
}) {
  await relatorioQueue.add('gerar-relatorio', data, {
    jobId: `${data.tenantId}-${data.tipo}-${Date.now()}`,
    removeOnComplete: true,
    removeOnFail: false,
  });
}

// Exemplo: Integração com gateway de pagamento
export async function processarPagamentoJob(data: {
  pedidoId: string;
  gateway: 'stripe' | 'asaas';
  valor: number;
}) {
  await pagamentoQueue.add('cobranca', data, {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    delay: 86400000, // Delay de 24h para cobrança recorrente
  });
}
```

**Monitoramento:**
```bash
# Interface web para monitorar filas
npm install @bull-board/express @bull-board/api

// backend/src/queues/board.ts
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { emailQueue, relatorioQueue, pagamentoQueue } from './queues';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
    new BullMQAdapter(relatorioQueue),
    new BullMQAdapter(pagamentoQueue),
  ],
  serverAdapter,
});

// Adicionar ao server.js
app.use('/admin/queues', serverAdapter.getRouter());
```

### 4. Gateway de Pagamento

**Opções recomendadas para Brasil:**

#### Opção A: Stripe (Internacional + Brasil)
```bash
npm install stripe
```

```typescript
// backend/src/services/stripe.service.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

async function criarAssinatura(clienteEmail: string, planoId: string) {
  const customer = await stripe.customers.create({
    email: clienteEmail,
    metadata: { planoId },
  });
  
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: planoId }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
  });
  
  return {
    subscriptionId: subscription.id,
    clientSecret: subscription.latest_invoice.payment_intent.client_secret,
  };
}

async function cancelarAssinatura(subscriptionId: string) {
  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}
```

#### Opção B: Asaas (Foco Brasil)
```bash
npm install asaas
```

```typescript
// backend/src/services/asaas.service.ts
import Asaas from 'asaas';

const asaas = new Asaas({
  apiKey: process.env.ASAAS_API_KEY,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
});

async function criarCobranca(valor: number, vencimento: Date, cliente: any) {
  const cobranca = await asaas.createSubscription({
    customer: cliente.asaasCustomerId,
    billingType: 'CREDIT_CARD', // ou 'BOLETO', 'PIX'
    value: valor,
    nextDueDate: vencimento.toISOString().split('T')[0],
    cycle: 'MONTHLY',
  });
  
  return cobranca;
}

async function criarClienteAsaas(nome: string, email: string, cpfCnpj: string) {
  const customer = await asaas.createCustomer({
    name: nome,
    email: email,
    cpfCnpj: cpfCnpj,
  });
  
  return customer;
}
```

**Webhooks (Sincronização):**
```typescript
// backend/src/controllers/webhooks.controller.ts
router.post('/webhooks/stripe', async (req, res) => {
  const signature = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    switch (event.type) {
      case 'invoice.payment_succeeded':
        // Atualizar status da assinatura
        await atualizarAssinaturaAtiva(event.data.object);
        break;
      case 'invoice.payment_failed':
        // Marcar como pendente
        await marcarAssinaturaPendente(event.data.object);
        break;
    }
    
    res.json({ received: true });
  } catch (error) {
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});
```

### Diagrama de Arquitetura Completa

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React + TypeScript + Shadcn UI + TanStack Table            │
│  + React Hook Form + Zod + Recharts + TanStack Query        │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS/REST API
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   LOAD BALANCER                              │
│                    (Nginx/Cloudflare)                        │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
┌─────────▼──────────┐        ┌─────────▼──────────┐
│   API (NestJS)     │        │   API (NestJS)     │
│  - Auth Module     │        │  - Tenants Module  │
│  - Users Module    │        │  - Chamados Module │
│  - CRM Module      │        │  - Products Module │
│  - E-commerce Mod  │        │  - Members Module  │
│  - Payments Mod    │        │  - Dashboard Mod   │
└─────────┬──────────┘        └─────────┬──────────┘
          │                             │
          └──────────────┬──────────────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
┌─────────▼──────────┐        ┌─────────▼──────────┐
│  PostgreSQL        │        │  Redis             │
│  (Multi-tenant)    │        │  - Cache           │
│                    │        │  - Sessions        │
│  tenants           │        │  - Queues          │
│  usuarios          │        │    (BullMQ)        │
│  chamados          │        │                    │
│  clientes          │        │                    │
│  produtos          │        │                    │
│  pedidos           │        │                    │
│  membros           │        │                    │
│  permissoes        │        │                    │
│  roles             │        │                    │
└────────────────────┘        └────────────────────┘

SERVIÇOS EXTERNOS:
├── Stripe/Asaas (Pagamentos)
├── SendGrid/Mailgun (E-mails)
├── AWS S3/Cloudinary (Upload de arquivos)
├── Sentry (Monitoramento de erros)
└── Cloudflare (CDN + WAF)
```

## 📚 Próximos Passos Imediatos

1. **Curto prazo** (esta semana):
   - [ ] Adicionar validação com express-validator em todas as rotas
   - [ ] Implementar testes manuais dos fluxos principais
   - [ ] Documentar variáveis de ambiente necessárias

2. **Médio prazo** (próximas 2 semanas):
   - [ ] Avaliar necessidade de migração para TypeScript
   - [ ] Se optar por NestJS: Criar projeto paralelo
   - [ ] Migrar módulo por módulo

3. **Longo prazo** (próximo mês):
   - [ ] Implementar testes automatizados
   - [ ] Adicionar logs estruturados
   - [ ] Configurar monitoramento (Sentry, Datadog)

---

**Conclusão**: O projeto atual tem uma base sólida com Express + PostgreSQL. A migração para NestJS + TypeScript trará benefícios significativos em manutenibilidade, tipagem e escalabilidade, mantendo a familiaridade com o ecossistema Node.js.