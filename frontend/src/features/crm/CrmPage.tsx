import { NavLink, Outlet } from 'react-router-dom';

/**
 * Shell do módulo CRM (RBAC ADMIN/AGENT na rota).
 * Abas internas: Clientes (CRUD) e Funil (deals + agregação).
 */
export function CrmPage() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>CRM</h1>
          <p>Clientes e funil de vendas do tenant.</p>
        </div>
      </header>

      <nav className="tabs" aria-label="Seções do CRM">
        <NavLink to="clientes" className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
          Clientes
        </NavLink>
        <NavLink to="funil" className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
          Funil de vendas
        </NavLink>
      </nav>

      <Outlet />
    </div>
  );
}
