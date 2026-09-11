import { Icon } from '@/components/ui/Icon';
import { TenantSelector } from './TenantSelector';
import { UserMenu } from './UserMenu';

interface HeaderProps {
  /** Abre a sidebar off-canvas (visível apenas no mobile). */
  onMenuClick: () => void;
}

/** Header sticky com seletor de dados do tenant e menu do usuário. */
export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="header">
      <button className="icon-btn header-burger" onClick={onMenuClick} aria-label="Abrir menu">
        <Icon name="menu" />
      </button>
      <div className="header-actions">
        <TenantSelector />
        <UserMenu />
      </div>
    </header>
  );
}
