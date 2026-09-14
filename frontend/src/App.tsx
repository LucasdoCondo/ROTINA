import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { AuthProvider } from '@/features/auth/auth-context';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TicketsPage } from '@/features/tickets/TicketsPage';
import { TicketDetailPage } from '@/features/tickets/TicketDetailPage';
import { CrmPage } from '@/features/crm/CrmPage';
import { CustomersPage } from '@/features/crm/CustomersPage';
import { DealsPage } from '@/features/crm/DealsPage';
import { MembersPage } from '@/features/members/MembersPage';
import { ProductsPage } from '@/features/ecommerce/ProductsPage';
import { OrdersPage } from '@/features/ecommerce/OrdersPage';
import { SubscriptionPage } from '@/features/payments/SubscriptionPage';
import { NotFoundPage } from '@/components/ui/PageStates';

/**
 * Mapa de rotas:
 *   /login           — pública
 *   /                — protegida (qualquer usuário autenticado)
 *   /tickets         — protegida (ADMIN/AGENT/MEMBER; RBAC fino no backend)
 *   /tickets/:id     — detalhe + histórico do chamado
 *   /crm/*           — módulo STAFF (ADMIN/AGENT; MEMBER recebe 403)
 *   *                — 404
 */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />

              <Route
                path="/tickets"
                element={
                  <ProtectedRoute roles={['ADMIN', 'AGENT', 'MEMBER']}>
                    <TicketsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tickets/:id"
                element={
                  <ProtectedRoute roles={['ADMIN', 'AGENT', 'MEMBER']}>
                    <TicketDetailPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/crm"
                element={
                  <ProtectedRoute roles={['ADMIN', 'AGENT']}>
                    <CrmPage />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="clientes" replace />} />
                <Route path="clientes" element={<CustomersPage />} />
                <Route path="funil" element={<DealsPage />} />
              </Route>

              <Route
                path="/members"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <MembersPage />
                  </ProtectedRoute>
                }
              />

                           <Route
                path="/ecommerce"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="produtos" replace />} />
                <Route path="produtos" element={<ProductsPage />} />
                <Route path="pedidos" element={<OrdersPage />} />
              </Route>

              <Route
                path="/assinatura"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <SubscriptionPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
