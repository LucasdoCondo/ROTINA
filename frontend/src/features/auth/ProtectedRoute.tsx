import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ForbiddenPage } from '@/components/ui/PageStates';
import type { UserRole } from '@/types/api';

interface ProtectedRouteProps {
  /**
   * Roles autorizadas (RBAC flat, igual ao requireRole do backend).
   * Omitido = qualquer usuário autenticado tem acesso.
   */
  roles?: UserRole[];
  children: ReactNode;
}

/**
 * Guarda de rota em duas camadas:
 *   1. Autenticação — sem sessão → redirect para /login preservando o destino
 *      (post-login volta para a rota original via location.state.from).
 *   2. Autorização — autenticado sem role permitido → 403 explícito
 *      (sem redirect, para não mascarar problemas de permissão).
 *
 * Defesa em profundidade: o backend revalida JWT e RBAC em cada request;
 * este componente é apenas UX.
 */
export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { status, hasRole } = useAuth();
  const location = useLocation();

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !hasRole(roles)) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
