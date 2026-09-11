import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

/**
 * Shell do painel: Sidebar fixa (off-canvas no mobile) + Header sticky +
 * conteúdo rotado via <Outlet />. As rotas filhas ficam aninhadas a este
 * layout no App.tsx.
 */
export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="layout-main">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
