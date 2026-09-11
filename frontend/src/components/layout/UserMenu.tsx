import { useAuth } from '@/hooks/useAuth';
import { Icon } from '@/components/ui/Icon';
import { ROLE_LABEL } from '@/types/api';

/** Iniciais do nome para o avatar. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Menu do usuário no header: identidade + perfil + logout. */
export function UserMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <details className="header-menu user-menu">
      <summary aria-label="Menu do usuário">
        <span className="avatar">{initials(user.name)}</span>
        <span className="user-name">{user.name}</span>
        <Icon name="chevron-down" size={16} />
      </summary>

      <div className="menu">
        <div className="menu-row">
          <span>E-mail</span>
          <span>{user.email}</span>
        </div>
        <div className="menu-row">
          <span>Perfil</span>
          <span className={`badge role-${user.role.toLowerCase()}`}>{ROLE_LABEL[user.role]}</span>
        </div>
        <button className="btn btn-ghost menu-logout" onClick={() => void logout()}>
          <Icon name="logout" size={18} /> Sair
        </button>
      </div>
    </details>
  );
}
