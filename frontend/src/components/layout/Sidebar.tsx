import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from '@/components/ui/Icon';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/tickets', label: 'Chamados', icon: 'tickets' },
  { to: '/crm', label: 'CRM', icon: 'users' },
  { to: '/ecommerce', label: 'E-commerce', icon: 'shopping' },
  { to: '/members', label: 'Membros', icon: 'users' },
];

/** Navegação lateral. Responsividade: fixed no desktop, off-canvas + backdrop no mobile. */
export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}
      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Navegação principal">
        <div className="sidebar-header">
          <span className="brand">ROTINA</span>
          <button className="icon-btn sidebar-close" onClick={onClose} aria-label="Fechar menu">
            <Icon name="close" />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <footer className="sidebar-footer">v0.1.0 · API /api/v1</footer>
      </aside>
    </>
  );
}
