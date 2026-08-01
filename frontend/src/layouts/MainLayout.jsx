import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { OnboardingTour } from '../components/OnboardingTour';
import { SupportWidget } from '../components/SupportWidget';
import api from '../services/api';
import {
  LayoutDashboard,
  Users,
  Ticket,
  UserCheck,
  ShoppingCart,
  Box,
  ShoppingBag,
  Crown,
  History,
  LogOut,
  Menu,
  X,
  FileText,
  Shield,
  Trash2,
} from 'lucide-react';
import './MainLayout.css';

export const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout, showOnboarding } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/usuarios', icon: Users, label: 'Usuários' },
    { path: '/chamados', icon: Ticket, label: 'Chamados' },
    { path: '/clientes', icon: UserCheck, label: 'Clientes' },
    { path: '/produtos', icon: Box, label: 'Produtos' },
    { path: '/pedidos', icon: ShoppingBag, label: 'Pedidos' },
    { path: '/membros', icon: Crown, label: 'Membros' },
    { path: '/auditoria', icon: History, label: 'Auditoria' },
  ];

  const handleDeleteOrganization = async () => {
    const confirmed = window.confirm(
      'ATENÇÃO: Esta ação excluirá PERMANENTEMENTE toda a organização, incluindo todos os dados, usuários, clientes, pedidos e configurações. Esta ação NÃO pode ser desfeita. Tem certeza?'
    );

    if (!confirmed) return;

    const doubleConfirm = window.prompt(
      'Para confirmar, digite "EXCLUIR ORGANIZAÇÃO" (exatamente como escrito):'
    );

    if (doubleConfirm !== 'EXCLUIR ORGANIZAÇÃO') {
      alert('Confirmação inválida. A exclusão foi cancelada.');
      return;
    }

    try {
      const response = await api.delete('/dashboard/organization');
      const data = response.data;

      if (response.status === 200) {
        alert('Organização excluída com sucesso. Você será redirecionado para o login.');
        window.location.href = '/login';
      } else {
        alert(`Erro: ${data.message || 'Falha ao excluir organização'}`);
      }
    } catch (error) {
      console.error('Erro ao excluir organização:', error);
      alert(error.response?.data?.message || 'Erro ao excluir organização. Tente novamente.');
    }
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>SaaS System</h2>
          <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon size={20} />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.nome?.charAt(0).toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="user-details">
                <p className="user-name">{user?.nome}</p>
                <p className="user-role">{user?.cargo}</p>
              </div>
            )}
          </div>
          <div className="footer-actions">
            <NavLink to="/terms" className="legal-link">
              <FileText size={18} />
              {sidebarOpen && <span>Termos</span>}
            </NavLink>
            <NavLink to="/privacy" className="legal-link">
              <Shield size={18} />
              {sidebarOpen && <span>Privacidade</span>}
            </NavLink>
            {user?.cargo === 'ADMIN' && (
              <button
                className="delete-org-btn"
                onClick={handleDeleteOrganization}
                title="Excluir Organização (LGPD)"
              >
                <Trash2 size={18} />
                {sidebarOpen && <span>Excluir Org.</span>}
              </button>
            )}
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={20} />
              {sidebarOpen && <span>Sair</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
        <OnboardingTour isFirstLogin={showOnboarding} />
        <SupportWidget />
      </main>
    </div>
  );
};