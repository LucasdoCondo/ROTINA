import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MainLayout } from './layouts/MainLayout';
import { Login } from './pages/Login';
import { Registrar } from './pages/Registrar';
import { Dashboard } from './pages/Dashboard';
import { BillingUpgrade } from './pages/BillingUpgrade';
import { Auditoria } from './pages/Auditoria';
import { AuditoriaDemo } from './pages/AuditoriaDemo';
import { SubscriptionGuard } from './components/SubscriptionGuard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { initSentry } from './utils/sentry';
import { Analytics } from '@vercel/analytics/react';

// Componente para rotas protegidas (autenticação)
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Componente para rotas públicas (redireciona se já autenticado)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Carregando...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Componente para rotas que exigem assinatura ativa
const SubscriptionRequired = ({ children }) => {
  return (
    <ProtectedRoute>
      <SubscriptionGuard>
        {children}
      </SubscriptionGuard>
    </ProtectedRoute>
  );
};

function AppRoutes() {
  return (
    <ErrorBoundary>
      <Routes>
      {/* ═══════════════════════════════════════════════
          Rotas Públicas (sem autenticação)
          ═══════════════════════════════════════════════ */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/registrar"
        element={
          <PublicRoute>
            <Registrar />
          </PublicRoute>
        }
      />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />

      {/* ═══════════════════════════════════════════════
          Rota de Upgrade / Cobrança
          Acessível com autenticação, mas SEM SubscriptionGuard
          (para permitir que usuários inadimplentes paguem)
          ═══════════════════════════════════════════════ */}
      <Route
        path="/billing/upgrade"
        element={
          <ProtectedRoute>
            <BillingUpgrade />
          </ProtectedRoute>
        }
      />

      {/* ═══════════════════════════════════════════════
          Rotas Protegidas (autenticação + assinatura ativa)
          ═══════════════════════════════════════════════ */}
      <Route
        path="/"
        element={
          <SubscriptionRequired>
            <MainLayout />
          </SubscriptionRequired>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="auditoria" element={<Auditoria />} />
        <Route path="auditoria/demo" element={<AuditoriaDemo />} />
        {/* Rotas dos módulos serão adicionadas aqui */}
      </Route>

      {/* ═══════════════════════════════════════════════
          Rota fallback
          ═══════════════════════════════════════════════ */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ErrorBoundary>
  );
}

function App() {
  // Inicializa Sentry uma única vez no carregamento da aplicação
  if (import.meta.env.VITE_SENTRY_DSN) {
    initSentry();
  }

  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        <Analytics />
      </AuthProvider>
    </Router>
  );
}

export default App;