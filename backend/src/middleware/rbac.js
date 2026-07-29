/**
 * RBAC - Role-Based Access Control
 * 
 * Matriz de permissões definindo quais ações cada cargo pode executar.
 * 
 * Cargos (Role):
 *   ADMIN   - Acesso total ao sistema
 *   MANAGER - Acesso gerencial (operações, mas sem exclusão/configurações)
 *   MEMBER  - Acesso básico (leitura e criação própria)
 */

// ============================================
// Definição das Ações (Actions)
// ============================================

/**
 * @typedef {'user:list'|'user:invite'|'user:update'|'user:delete'|'user:role_change'} UserAction
 * @typedef {'ticket:list'|'ticket:create'|'ticket:update'|'ticket:delete'|'ticket:assign'|'ticket:comment'} TicketAction
 * @typedef {'client:list'|'client:create'|'client:update'|'client:delete'} ClientAction
 * @typedef {'product:list'|'product:create'|'product:update'|'product:delete'} ProductAction
 * @typedef {'order:list'|'order:create'|'order:update'|'order:delete'} OrderAction
 * @typedef {'billing:view'|'billing:manage'} BillingAction
 * @typedef {'dashboard:view'|'dashboard:admin'} DashboardAction
 * @typedef {'settings:view'|'settings:manage'} SettingsAction
 * @typedef {'member:list'|'member:create'|'member:update'|'member:delete'} MemberAction
 */

/**
 * @typedef {UserAction | TicketAction | ClientAction | ProductAction | OrderAction | BillingAction | DashboardAction | SettingsAction | MemberAction} Action
 * @typedef {'ADMIN' | 'MANAGER' | 'MEMBER'} Role
 */

// ============================================
// Matriz de Permissões
// ============================================

const permissionsMap = {
  // ═══════════════════════════════════════════
  // USUÁRIOS (User Management)
  // ═══════════════════════════════════════════
  'user:list': ['ADMIN', 'MANAGER'],
  'user:invite': ['ADMIN', 'MANAGER'],
  'user:update': ['ADMIN'],
  'user:delete': ['ADMIN'],
  'user:role_change': ['ADMIN'],

  // ═══════════════════════════════════════════
  // CHAMADOS / TICKETS (Suporte)
  // ═══════════════════════════════════════════
  'ticket:list': ['ADMIN', 'MANAGER', 'MEMBER'],
  'ticket:create': ['ADMIN', 'MANAGER', 'MEMBER'],
  'ticket:update': ['ADMIN', 'MANAGER'],
  'ticket:delete': ['ADMIN'],
  'ticket:assign': ['ADMIN', 'MANAGER'],
  'ticket:comment': ['ADMIN', 'MANAGER', 'MEMBER'],

  // ═══════════════════════════════════════════
  // CLIENTES (CRM)
  // ═══════════════════════════════════════════
  'client:list': ['ADMIN', 'MANAGER', 'MEMBER'],
  'client:create': ['ADMIN', 'MANAGER'],
  'client:update': ['ADMIN', 'MANAGER'],
  'client:delete': ['ADMIN'],

  // ═══════════════════════════════════════════
  // PRODUTOS (Estoque)
  // ═══════════════════════════════════════════
  'product:list': ['ADMIN', 'MANAGER', 'MEMBER'],
  'product:create': ['ADMIN', 'MANAGER'],
  'product:update': ['ADMIN', 'MANAGER'],
  'product:delete': ['ADMIN'],

  // ═══════════════════════════════════════════
  // PEDIDOS / VENDAS (Orders)
  // ═══════════════════════════════════════════
  'order:list': ['ADMIN', 'MANAGER', 'MEMBER'],
  'order:create': ['ADMIN', 'MANAGER'],
  'order:update': ['ADMIN', 'MANAGER'],
  'order:delete': ['ADMIN'],

  // ═══════════════════════════════════════════
  // MEMBROS / ASSINATURAS (Members)
  // ═══════════════════════════════════════════
  'member:list': ['ADMIN', 'MANAGER'],
  'member:create': ['ADMIN', 'MANAGER'],
  'member:update': ['ADMIN'],
  'member:delete': ['ADMIN'],

  // ═══════════════════════════════════════════
  // FATURAMENTO / COBRANÇA (Billing)
  // ═══════════════════════════════════════════
  'billing:view': ['ADMIN', 'MANAGER'],
  'billing:manage': ['ADMIN'],

  // ═══════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════
  'dashboard:view': ['ADMIN', 'MANAGER', 'MEMBER'],
  'dashboard:admin': ['ADMIN'],

  // ═══════════════════════════════════════════
  // CONFIGURAÇÕES (Settings)
  // ═══════════════════════════════════════════
  'settings:view': ['ADMIN', 'MANAGER'],
  'settings:manage': ['ADMIN'],

  // ═══════════════════════════════════════════
  // TENANT / ORGANIZAÇÃO (LGPD - Exclusão em cascata)
  // ═══════════════════════════════════════════
  'tenant:delete': ['ADMIN'],
};

// ============================================
// Funções de Verificação
// ============================================

/**
 * Verifica se um cargo tem permissão para executar uma ação.
 * 
 * @param {Role} role - Cargo do usuário (ADMIN, MANAGER, MEMBER)
 * @param {Action} action - Ação a ser verificada
 * @returns {boolean} true se tem permissão, false caso contrário
 * 
 * @example
 * hasPermission('MANAGER', 'client:create') // true
 * hasPermission('MEMBER', 'user:invite')    // false
 */
function hasPermission(role, action) {
  const allowedRoles = permissionsMap[action];
  
  if (!allowedRoles) {
    console.warn(`[RBAC] Ação desconhecida: "${action}"`);
    return false;
  }
  
  return allowedRoles.includes(role);
}

/**
 * Retorna a lista de ações que um cargo pode executar.
 * 
 * @param {Role} role - Cargo do usuário
 * @returns {Action[]} Lista de ações permitidas
 */
function getPermissionsForRole(role) {
  return Object.entries(permissionsMap)
    .filter(([_, roles]) => roles.includes(role))
    .map(([action]) => action);
}

/**
 * Retorna todos os cargos que podem executar uma ação.
 * 
 * @param {Action} action - Ação a ser consultada
 * @returns {Role[]} Lista de cargos permitidos
 */
function getRolesForAction(action) {
  return permissionsMap[action] || [];
}

// ============================================
// Hierarquia de Cargos
// ============================================

/**
 * Hierarquia de cargos (quanto maior o nível, mais permissões).
 * Útil para validações como "apenas cargos superiores podem modificar".
 */
const roleHierarchy = {
  ADMIN: 3,
  MANAGER: 2,
  MEMBER: 1,
};

/**
 * Verifica se um cargo tem nível hierárquico superior a outro.
 * 
 * @param {Role} role - Cargo a ser verificado
 * @param {Role} targetRole - Cargo alvo da comparação
 * @returns {boolean} true se role tem hierarquia superior a targetRole
 */
function isRoleSuperior(role, targetRole) {
  return roleHierarchy[role] > roleHierarchy[targetRole];
}

// ============================================
// Exportação
// ============================================

module.exports = {
  hasPermission,
  getPermissionsForRole,
  getRolesForAction,
  isRoleSuperior,
  permissionsMap,
  roleHierarchy,
  // Constantes para uso em validações
  ROLES: {
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    MEMBER: 'MEMBER',
  },
};