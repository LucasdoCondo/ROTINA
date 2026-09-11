/**
 * Testes unitarios de la matriz RBAC.
 *
 * Valida que la matriz de permisos (backend/src/middleware/rbac.js)
 * cumpla con las reglas del sistema:
 * - ADMIN: acceso total
 * - MANAGER: operaciones, sin exclusión ni configuración sensible
 * - MEMBER: solo lectura y creación propia
 */

const {
  hasPermission,
  getPermissionsForRole,
  getRolesForAction,
  isRoleSuperior,
  ROLES,
} = require('../src/middleware/rbac');

describe('Matriz RBAC', () => {
  describe('hasPermission — ADMIN', () => {
    const actions = [
      'user:list', 'user:invite', 'user:update', 'user:delete', 'user:role_change',
      'ticket:list', 'ticket:create', 'ticket:update', 'ticket:delete', 'ticket:assign', 'ticket:comment',
      'client:list', 'client:create', 'client:update', 'client:delete',
      'product:list', 'product:create', 'product:update', 'product:delete',
      'order:list', 'order:create', 'order:update', 'order:delete',
      'member:list', 'member:create', 'member:update', 'member:delete',
      'billing:view', 'billing:manage',
      'dashboard:view', 'dashboard:admin',
      'settings:view', 'settings:manage',
      'tenant:export', 'tenant:delete',
    ];

    test.each(actions)('ADMIN tiene permiso para %s', (action) => {
      expect(hasPermission('ADMIN', action)).toBe(true);
    });
  });

  describe('hasPermission — MANAGER', () => {
    test('MANAGER puede listar/crear clientes y productos', () => {
      expect(hasPermission('MANAGER', 'client:list')).toBe(true);
      expect(hasPermission('MANAGER', 'client:create')).toBe(true);
      expect(hasPermission('MANAGER', 'product:create')).toBe(true);
      expect(hasPermission('MANAGER', 'order:create')).toBe(true);
    });

    test('MANAGER NO puede eliminar clientes ni productos', () => {
      expect(hasPermission('MANAGER', 'client:delete')).toBe(false);
      expect(hasPermission('MANAGER', 'product:delete')).toBe(false);
    });

    test('MANAGER NO puede cambiar roles, ni borrar usuarios', () => {
      expect(hasPermission('MANAGER', 'user:role_change')).toBe(false);
      expect(hasPermission('MANAGER', 'user:update')).toBe(false);
      expect(hasPermission('MANAGER', 'user:delete')).toBe(false);
    });

    test('MANAGER NO puede gestionar billing', () => {
      expect(hasPermission('MANAGER', 'billing:manage')).toBe(false);
      expect(hasPermission('MANAGER', 'settings:manage')).toBe(false);
    });

    test('MANAGER NO tiene acciones de tenant (LGPD export/delete)', () => {
      expect(hasPermission('MANAGER', 'tenant:export')).toBe(false);
      expect(hasPermission('MANAGER', 'tenant:delete')).toBe(false);
    });
  });

  describe('hasPermission — MEMBER', () => {
    test('MEMBER solo puede leer y crear su propio trabajo', () => {
      expect(hasPermission('MEMBER', 'ticket:list')).toBe(true);
      expect(hasPermission('MEMBER', 'ticket:create')).toBe(true);
      expect(hasPermission('MEMBER', 'ticket:comment')).toBe(true);
      expect(hasPermission('MEMBER', 'client:list')).toBe(true);
    });

    test('MEMBER NO puede crear/actualizar/eliminar clientes', () => {
      expect(hasPermission('MEMBER', 'client:create')).toBe(false);
      expect(hasPermission('MEMBER', 'client:update')).toBe(false);
      expect(hasPermission('MEMBER', 'client:delete')).toBe(false);
    });

    test('MEMBER NO tiene acceso a usuarios, billing ni settings', () => {
      expect(hasPermission('MEMBER', 'user:list')).toBe(false);
      expect(hasPermission('MEMBER', 'user:invite')).toBe(false);
      expect(hasPermission('MEMBER', 'billing:view')).toBe(false);
      expect(hasPermission('MEMBER', 'settings:view')).toBe(false);
      expect(hasPermission('MEMBER', 'member:list')).toBe(false);
    });
  });

  describe('Acciones desconocidas', () => {
    test('Devuelve false y no explota', () => {
      expect(hasPermission('ADMIN', 'no:existe')).toBe(false);
      expect(hasPermission('MEMBER', '')).toBe(false);
    });
  });

  describe('getPermissionsForRole', () => {
    test('ADMIN tiene más permisos que MANAGER, y MANAGER más que MEMBER', () => {
      const perms = {
        ADMIN: getPermissionsForRole('ADMIN').length,
        MANAGER: getPermissionsForRole('MANAGER').length,
        MEMBER: getPermissionsForRole('MEMBER').length,
      };
      expect(perms.ADMIN).toBeGreaterThan(perms.MANAGER);
      expect(perms.MANAGER).toBeGreaterThan(perms.MEMBER);
    });

    test('Incluye tenant:delete solo para ADMIN', () => {
      expect(getPermissionsForRole('ADMIN')).toContain('tenant:delete');
      expect(getPermissionsForRole('MANAGER')).not.toContain('tenant:delete');
    });
  });

  describe('getRolesForAction', () => {
    test('ticket:create está disponible para los 3 cargos', () => {
      const roles = getRolesForAction('ticket:create');
      expect(roles).toEqual(['ADMIN', 'MANAGER', 'MEMBER']);
    });

    test('user:delete solo ADMIN', () => {
      const roles = getRolesForAction('user:delete');
      expect(roles).toEqual(['ADMIN']);
    });

    test('Acción desconocida → arreglo vacío', () => {
      expect(getRolesForAction('fake:action')).toEqual([]);
    });
  });

  describe('isRoleSuperior', () => {
    test('ADMIN > MANAGER > MEMBER', () => {
      expect(isRoleSuperior(ROLES.ADMIN, ROLES.MANAGER)).toBe(true);
      expect(isRoleSuperior(ROLES.MANAGER, ROLES.MEMBER)).toBe(true);
      expect(isRoleSuperior(ROLES.ADMIN, ROLES.MEMBER)).toBe(true);
    });

    test('No es superior a sí mismo', () => {
      expect(isRoleSuperior(ROLES.ADMIN, ROLES.ADMIN)).toBe(false);
    });

    test('MEMBER no es superior a nadie', () => {
      expect(isRoleSuperior(ROLES.MEMBER, ROLES.ADMIN)).toBe(false);
      expect(isRoleSuperior(ROLES.MEMBER, ROLES.MANAGER)).toBe(false);
    });
  });
});