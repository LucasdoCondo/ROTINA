# RBAC - Role-Based Access Control

> Sistema de Controle de Acesso Baseado em Cargos para o SaaS ROTINA.

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Cargos (Roles)](#2-cargos-roles)
3. [Matriz de Permissões](#3-matriz-de-permissões)
4. [Como Usar no Backend](#4-como-usar-no-backend)
5. [Como Usar no Frontend](#5-como-usar-no-frontend)
6. [Hierarquia de Cargos](#6-hierarquia-de-cargos)
7. [Exemplos Práticos](#7-exemplos-práticos)
8. [Boas Práticas](#8-boas-práticas)

---

## 1. Visão Geral

O RBAC (Role-Based Access Control) é implementado em duas camadas:

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (UI)                           │
│  Oculta botões/menus que o usuário não pode acessar        │
│  (UX, mas NÃO substitui a validação no backend)            │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     BACKEND (API)                           │
│  Middleware `authorize('action')` valida permissão real     │
│  (Segurança: sempre validar no servidor)                   │
└─────────────────────────────────────────────────────────────┘
```

### Arquivos do Sistema

| Arquivo | Descrição |
|---------|-----------|
| `backend/src/middleware/rbac.js` | Módulo principal com matriz de permissões e funções de verificação |
| `backend/src/middleware/auth.js` | Middleware `authorize()` que integra RBAC às rotas Express |
| `backend/src/routes/*.js` | Rotas protegidas com `authorize('action')` |

---

## 2. Cargos (Roles)

O schema do Prisma já define três cargos no enum `Role`:

```prisma
enum Role {
  ADMIN
  MANAGER
  MEMBER
}
```

| Cargo | Nível | Descrição |
|-------|-------|-----------|
| **ADMIN** | 3 | Acesso total ao sistema. Pode criar/editar/excluir qualquer recurso, gerenciar configurações e faturamento. |
| **MANAGER** | 2 | Acesso gerencial. Pode criar e editar recursos, mas não pode excluir nem alterar configurações críticas. |
| **MEMBER** | 1 | Acesso básico. Pode visualizar dados e criar chamados, mas não pode alterar recursos de outros usuários. |

---

## 3. Matriz de Permissões

### 3.1 Usuários (User Management)

| Ação | ADMIN | MANAGER | MEMBER |
|------|-------|---------|--------|
| `user:list` | ✅ | ✅ | ❌ |
| `user:invite` | ✅ | ✅ | ❌ |
| `user:update` | ✅ | ❌ | ❌ |
| `user:delete` | ✅ | ❌ | ❌ |
| `user:role_change` | ✅ | ❌ | ❌ |

### 3.2 Chamados / Tickets (Suporte)

| Ação | ADMIN | MANAGER | MEMBER |
|------|-------|---------|--------|
| `ticket:list` | ✅ | ✅ | ✅ |
| `ticket:create` | ✅ | ✅ | ✅ |
| `ticket:update` | ✅ | ✅ | ❌ |
| `ticket:delete` | ✅ | ❌ | ❌ |
| `ticket:assign` | ✅ | ✅ | ❌ |
| `ticket:comment` | ✅ | ✅ | ✅ |

### 3.3 Clientes (CRM)

| Ação | ADMIN | MANAGER | MEMBER |
|------|-------|---------|--------|
| `client:list` | ✅ | ✅ | ✅ |
| `client:create` | ✅ | ✅ | ❌ |
| `client:update` | ✅ | ✅ | ❌ |
| `client:delete` | ✅ | ❌ | ❌ |

### 3.4 Produtos (Estoque)

| Ação | ADMIN | MANAGER | MEMBER |
|------|-------|---------|--------|
| `product:list` | ✅ | ✅ | ✅ |
| `product:create` | ✅ | ✅ | ❌ |
| `product:update` | ✅ | ✅ | ❌ |
| `product:delete` | ✅ | ❌ | ❌ |

### 3.5 Pedidos / Vendas (Orders)

| Ação | ADMIN | MANAGER | MEMBER |
|------|-------|---------|--------|
| `order:list` | ✅ | ✅ | ✅ |
| `order:create` | ✅ | ✅ | ❌ |
| `order:update` | ✅ | ✅ | ❌ |
| `order:delete` | ✅ | ❌ | ❌ |

### 3.6 Membros / Assinaturas (Members)

| Ação | ADMIN | MANAGER | MEMBER |
|------|-------|---------|--------|
| `member:list` | ✅ | ✅ | ❌ |
| `member:create` | ✅ | ✅ | ❌ |
| `member:update` | ✅ | ❌ | ❌ |
| `member:delete` | ✅ | ❌ | ❌ |

### 3.7 Faturamento / Cobrança (Billing)

| Ação | ADMIN | MANAGER | MEMBER |
|------|-------|---------|--------|
| `billing:view` | ✅ | ✅ | ❌ |
| `billing:manage` | ✅ | ❌ | ❌ |

### 3.8 Dashboard

| Ação | ADMIN | MANAGER | MEMBER |
|------|-------|---------|--------|
| `dashboard:view` | ✅ | ✅ | ✅ |
| `dashboard:admin` | ✅ | ❌ | ❌ |

### 3.9 Configurações (Settings)

| Ação | ADMIN | MANAGER | MEMBER |
|------|-------|---------|--------|
| `settings:view` | ✅ | ✅ | ❌ |
| `settings:manage` | ✅ | ❌ | ❌ |

---

## 4. Como Usar no Backend

### 4.1 Protegendo Rotas

Use o middleware `authorize('action')` após o `authenticateToken`:

```javascript
const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientesController');
const { authenticateToken, authorize } = require('../middleware/auth');

// MEMBER+ pode listar clientes
router.get('/', authenticateToken, authorize('client:list'), clientesController.listarClientes);

// MANAGER+ pode criar clientes
router.post('/', authenticateToken, authorize('client:create'), clientesController.criarCliente);

// ADMIN only pode deletar clientes
router.delete('/:id', authenticateToken, authorize('client:delete'), clientesController.deletarCliente);

module.exports = router;
```

### 4.2 Verificando Permissão no Código

Você também pode usar a função `hasPermission` diretamente em services ou controllers:

```javascript
const { hasPermission } = require('../middleware/rbac');

function processarAcao(user, recurso) {
  if (!hasPermission(user.cargo, 'billing:manage')) {
    throw new Error('Acesso negado');
  }
  // ... lógica do faturamento
}
```

### 4.3 Obtendo Permissões de um Cargo

```javascript
const { getPermissionsForRole } = require('../middleware/rbac');

const permissoesAdmin = getPermissionsForRole('ADMIN');
// Retorna: ['user:list', 'user:invite', 'user:update', ...]
```

### 4.4 Verificando Hierarquia

```javascript
const { isRoleSuperior } = require('../middleware/rbac');

// Verificar se ADMIN é superior a MANAGER
isRoleSuperior('ADMIN', 'MANAGER'); // true

// Verificar se MEMBER é superior a ADMIN
isRoleSuperior('MEMBER', 'ADMIN'); // false
```

---

## 5. Como Usar no Frontend

### 5.1 Hook de Permissão

```javascript
// frontend/src/hooks/usePermission.js
import { hasPermission } from '../lib/permissions';

export function usePermission(action) {
  const { user } = useAuth(); // Seu hook de autenticação
  
  return {
    can: hasPermission(user?.cargo, action),
    role: user?.cargo,
  };
}
```

### 5.2 Componente Condicional

```jsx
// frontend/src/components/BillingButton.jsx
import { usePermission } from '../hooks/usePermission';

export function BillingSettingsButton() {
  const { can } = usePermission('billing:manage');
  
  if (!can) return null; // Não renderiza se não tiver permissão
  
  return (
    <button className="btn-primary">
      Gerenciar Assinatura
    </button>
  );
}
```

### 5.3 Renderização Condicional em Páginas

```jsx
// frontend/src/pages/Usuarios.jsx
import { usePermission } from '../hooks/usePermission';

export function UsuariosPage() {
  const { can } = usePermission('user:invite');
  
  return (
    <div>
      <h1>Usuários</h1>
      
      {can && (
        <button onClick={abrirModal}>
          Convidar Usuário
        </button>
      )}
      
      {/* Tabela de usuários */}
      <TabelaUsuarios />
    </div>
  );
}
```

### 5.4 Biblioteca de Permissões (Frontend)

```javascript
// frontend/src/lib/permissions.js

/**
 * Matriz de permissões (mesma do backend)
 * Mantida em sincronia com backend/src/middleware/rbac.js
 */
const permissionsMap = {
  'user:list': ['ADMIN', 'MANAGER'],
  'user:invite': ['ADMIN', 'MANAGER'],
  'user:update': ['ADMIN'],
  'user:delete': ['ADMIN'],
  'user:role_change': ['ADMIN'],
  
  'ticket:list': ['ADMIN', 'MANAGER', 'MEMBER'],
  'ticket:create': ['ADMIN', 'MANAGER', 'MEMBER'],
  'ticket:update': ['ADMIN', 'MANAGER'],
  'ticket:delete': ['ADMIN'],
  'ticket:assign': ['ADMIN', 'MANAGER'],
  'ticket:comment': ['ADMIN', 'MANAGER', 'MEMBER'],
  
  'client:list': ['ADMIN', 'MANAGER', 'MEMBER'],
  'client:create': ['ADMIN', 'MANAGER'],
  'client:update': ['ADMIN', 'MANAGER'],
  'client:delete': ['ADMIN'],
  
  'product:list': ['ADMIN', 'MANAGER', 'MEMBER'],
  'product:create': ['ADMIN', 'MANAGER'],
  'product:update': ['ADMIN', 'MANAGER'],
  'product:delete': ['ADMIN'],
  
  'order:list': ['ADMIN', 'MANAGER', 'MEMBER'],
  'order:create': ['ADMIN', 'MANAGER'],
  'order:update': ['ADMIN', 'MANAGER'],
  'order:delete': ['ADMIN'],
  
  'member:list': ['ADMIN', 'MANAGER'],
  'member:create': ['ADMIN', 'MANAGER'],
  'member:update': ['ADMIN'],
  'member:delete': ['ADMIN'],
  
  'billing:view': ['ADMIN', 'MANAGER'],
  'billing:manage': ['ADMIN'],
  
  'dashboard:view': ['ADMIN', 'MANAGER', 'MEMBER'],
  'dashboard:admin': ['ADMIN'],
  
  'settings:view': ['ADMIN', 'MANAGER'],
  'settings:manage': ['ADMIN'],
};

/**
 * Verifica se um cargo tem permissão para uma ação.
 * 
 * @param {string} role - Cargo do usuário (ADMIN, MANAGER, MEMBER)
 * @param {string} action - Ação a ser verificada
 * @returns {boolean}
 * 
 * @example
 * hasPermission('MANAGER', 'client:create') // true
 * hasPermission('MEMBER', 'user:invite')    // false
 */
export function hasPermission(role, action) {
  if (!role || !action) return false;
  
  const allowedRoles = permissionsMap[action];
  if (!allowedRoles) return false;
  
  return allowedRoles.includes(role);
}

/**
 * Retorna todas as ações que um cargo pode executar.
 * 
 * @param {string} role - Cargo do usuário
 * @returns {string[]} Lista de ações
 */
export function getPermissionsForRole(role) {
  return Object.entries(permissionsMap)
    .filter(([_, roles]) => roles.includes(role))
    .map(([action]) => action);
}
```

---

## 6. Hierarquia de Cargos

A hierarquia é útil para validações como "apenas cargos superiores podem modificar":

```
Nível 3: ADMIN  (maior autoridade)
Nível 2: MANAGER
Nível 1: MEMBER  (menor autoridade)
```

```javascript
const { isRoleSuperior } = require('../middleware/rbac');

// Exemplo: impedir que MANAGER altere dados de ADMIN
if (!isRoleSuperior(req.user.cargo, usuarioAlvo.cargo)) {
  return res.status(403).json({
    message: 'Você não pode modificar usuários com cargo superior ou igual ao seu'
  });
}
```

---

## 7. Exemplos Práticos

### 7.1 API: Criar Cliente (Apenas MANAGER+)

```javascript
// backend/src/routes/clientes.js
router.post('/', 
  authenticateToken, 
  authorize('client:create'), // ✅ MANAGER e ADMIN
  clientesController.criarCliente
);
```

### 7.2 API: Deletar Produto (Apenas ADMIN)

```javascript
// backend/src/routes/produtos.js
router.delete('/:id', 
  authenticateToken, 
  authorize('product:delete'), // ✅ Apenas ADMIN
  produtosController.deletarProduto
);
```

### 7.3 Frontend: Ocultar Botão de Exclusão

```jsx
function AcoesProduto({ produto, userRole }) {
  const podeExcluir = hasPermission(userRole, 'product:delete');
  
  return (
    <div className="acoes">
      <button>Editar</button>
      {podeExcluir && (
        <button className="btn-danger" onClick={() => excluir(produto.id)}>
          Excluir
        </button>
      )}
    </div>
  );
}
```

### 7.4 Controller: Validação Extra

```javascript
// backend/src/controllers/usuariosController.js
const { isRoleSuperior } = require('../middleware/rbac');

const atualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { cargo: novoCargo } = req.body;
    
    // Impedir que usuário se autopromova
    if (id === req.user.id && novoCargo && novoCargo !== req.user.cargo) {
      return res.status(403).json({
        message: 'Você não pode alterar seu próprio cargo'
      });
    }
    
    // Impedir que MANAGER promova alguém a ADMIN
    if (novoCargo && !isRoleSuperior(req.user.cargo, { ADMIN: 3, MANAGER: 2, MEMBER: 1 }[novoCargo])) {
      return res.status(403).json({
        message: 'Você não pode atribuir um cargo superior ao seu'
      });
    }
    
    // ... lógica de atualização
  } catch (error) {
    // ...
  }
};
```

---

## 8. Boas Práticas

### ✅ Faça

- **Sempre valide permissões no backend** — o frontend é apenas para UX
- **Use o middleware `authorize()` nas rotas** — é a forma mais declarativa
- **Mantenha a matriz de permissões sincronizada** entre frontend e backend
- **Use ações granulares** (`client:create`, `client:delete`) em vez de cargos genéricos
- **Log de acessos negados** — o RBAC já faz `console.warn` automaticamente

### ❌ Não Faça

- **Não confie apenas no frontend** — qualquer requisição pode ser forjada
- **Não use `isAdmin` para tudo** — prefira ações específicas
- **Não exponha a matriz de permissões interna** para o cliente
- **Não permita que usuários alterem seu próprio cargo**

### 🔒 Segurança

O middleware `authorize()` retorna:

| Status | Código | Significado |
|--------|--------|-------------|
| `401` | `UNAUTHORIZED` | Usuário não autenticado |
| `403` | `FORBIDDEN` | Usuário autenticado mas sem permissão |

Exemplo de resposta 403:

```json
{
  "message": "Acesso negado. Permissão \"client:delete\" requerida.",
  "code": "FORBIDDEN",
  "requiredPermission": "client:delete",
  "userRole": "MANAGER"
}
```

---

## Resumo

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   🛡️ ROTINA - RBAC Implementation                          │
│                                                             │
│   3 Cargos: ADMIN > MANAGER > MEMBER                       │
│   35+ Ações granulares                                      │
│   Backend: middleware authorize('action')                   │
│   Frontend: hook usePermission('action')                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

> **Arquivos criados/modificados:**
> - `backend/src/middleware/rbac.js` — Módulo RBAC (novo)
> - `backend/src/middleware/auth.js` — Middleware `authorize()` (modificado)
> - `backend/src/routes/*.js` — Todas as rotas com RBAC granular (modificadas)
> - `docs/RBAC.md` — Esta documentação (nova)