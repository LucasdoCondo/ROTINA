import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { useOpenTicketsMetric, useSalesMetric, rankOpenDeals } from '@/hooks/useDashboardMetrics';
import { useDeals } from '@/features/crm/hooks';
import { formatMoney } from '@/lib/format';
import { ROLE_LABEL } from '@/types/api';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Dashboard Overview: métricas rápidas via TanStack Query.
 * - Chamados abertos (OPEN + IN_PROGRESS + WAITING_ON_CUSTOMER).
 * - Vendas no CRM (funil + clientes; STAFF-only — MEMBER vê placeholder).
 * - Novos membros: o backend não expõe listagem de usuários → o card
 *   exibe o perfil do usuário logado (documentado na UI).
 */
export function DashboardPage() {
  const { user, tenant, hasRole } = useAuth();
  const tenantQuery = useTenant();
  const profile = tenantQuery.data;

  const tickets = useOpenTicketsMetric();
  const { funnel, customers, enabled: crmEnabled } = useSalesMetric();
  const dealsQuery = useDeals({ page: 1, pageSize: 20 }, crmEnabled);
  const topDeals = dealsQuery.data ? rankOpenDeals(dealsQuery.data.rows) : [];

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Visão geral de {tenant?.name ?? 'sua empresa'}.</p>
        </div>
      </header>

      <section className="cards" aria-label="Métricas rápidas">
        <article className="stat-card">
          <span className="stat-label">Chamados abertos</span>
          {tickets.isPending ? (
            <Spinner size={20} />
          ) : tickets.isError ? (
            <>
              <strong>—</strong>
              <span className="stat-hint">Não foi possível carregar.</span>
            </>
          ) : (
            <>
              <strong className="stat-value">{tickets.data.total}</strong>
              <span className="stat-hint">
                {tickets.data.byStatus.OPEN} abertos · {tickets.data.byStatus.IN_PROGRESS} em
                atendimento · {tickets.data.byStatus.WAITING_ON_CUSTOMER} aguardando cliente
              </span>
              {tickets.data.urgentOpen > 0 && (
                <span className="stat-hint stat-alert">
                  {tickets.data.urgentOpen} aberto(s) com prioridade alta/urgente
                </span>
              )}
            </>
          )}
          <Link className="stat-link" to="/tickets">Ver chamados →</Link>
        </article>

        <article className="stat-card">
          <span className="stat-label">Vendas no CRM</span>
          {!crmEnabled ? (
            <>
              <strong>—</strong>
              <span className="stat-hint">Disponível para ADMIN e AGENT.</span>
            </>
          ) : funnel.isPending || customers.isPending ? (
            <Spinner size={20} />
          ) : funnel.isError || customers.isError ? (
            <>
              <strong>—</strong>
              <span className="stat-hint">Não foi possível carregar.</span>
            </>
          ) : (
            <>
              <strong className="stat-value">
                {formatMoney(funnel.data.summary.openValue, 'BRL')}
              </strong>
              <span className="stat-hint">
                {funnel.data.summary.openCount} em aberto · {customers.data.meta.total} cliente(s) ·{' '}
                {funnel.data.summary.wonCount} ganho(s)
              </span>
            </>
          )}
          {crmEnabled && <Link className="stat-link" to="/crm/funil">Ver funil →</Link>}
        </article>

        <article className="stat-card">
          <span className="stat-label">Minha conta</span>
          <strong>{user?.name}</strong>
          <span className="stat-hint">
            {user ? ROLE_LABEL[user.role] : '—'} · {user?.email}
          </span>
          <span className="stat-hint">
            {profile
              ? `Tenant ${profile.name} · Plano ${profile.plan} · ${profile.status}`
              : tenant
                ? `Tenant ${tenant.name} · Plano ${tenant.plan}`
                : 'Contagem de membros indisponível (sem endpoint de usuários).'}
          </span>
        </article>
      </section>

      {crmEnabled && (
        <section className="panel" aria-label="Próximos fechamentos">
          <h2>Próximos fechamentos</h2>
          {dealsQuery.isPending ? (
            <Spinner size={22} />
          ) : dealsQuery.isError || !dealsQuery.data ? (
            <p className="menu-empty">Não foi possível carregar os deals.</p>
          ) : topDeals.length === 0 ? (
            <p className="menu-empty">Nenhum deal em aberto no momento.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Deal</th>
                    <th>Cliente</th>
                    <th>Estágio</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {topDeals.map((deal) => (
                    <tr key={deal.id}>
                      <td><strong>{deal.title}</strong></td>
                      <td>{deal.customer.name}</td>
                      <td><span className="badge badge-info">{deal.stage}</span></td>
                      <td>{formatMoney(deal.value, deal.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p>
            <Link to="/crm/funil">Abrir funil de vendas →</Link>
          </p>
        </section>
      )}

      {hasRole(['ADMIN', 'AGENT']) && (
        <section className="panel">
          <h2>Módulos</h2>
          <p>
            Os módulos de <strong>Chamados</strong> (<code>/tickets</code>) e <strong>CRM</strong>{' '}
            (<code>/crm</code>) estão conectados às APIs <code>/api/v1/tickets</code> e{' '}
            <code>/api/v1/crm</code> — com filtros, paginação e mutations via TanStack Query.
            Use a navegação lateral para acessá-los.
          </p>
        </section>
      )}
    </div>
  );
}
