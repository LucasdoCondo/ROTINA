import { useTenant } from '@/hooks/useTenant';
import { Icon } from '@/components/ui/Icon';

/**
 * Seletor de dados do Tenant no header (GET /tenants/me, cacheado pelo
 * TanStack Query). Como cada usuário pertence a um único tenant, o seletor
 * apresenta os dados da empresa corrente (nome, plano, status, contato).
 * Quando o backend expuser listagem de tenants por usuário, o dropdown
 * evolui para troca de tenant sem quebrar o contrato visual.
 */
export function TenantSelector() {
  const { data, isPending, isError } = useTenant();

  return (
    <details className="header-menu tenant-menu">
      <summary aria-label="Dados do tenant">
        <Icon name="building" size={18} />
        <span className="tenant-name">
          {isPending ? 'Carregando…' : isError ? 'Tenant' : data?.name}
        </span>
        {data && <span className={`badge plan-${data.plan.toLowerCase()}`}>{data.plan}</span>}
        <Icon name="chevron-down" size={16} />
      </summary>

      <div className="menu">
        {isError ? (
          <p className="menu-empty">Não foi possível carregar os dados do tenant.</p>
        ) : isPending || !data ? (
          <p className="menu-empty">Carregando tenant…</p>
        ) : (
          <>
            <div className="menu-row">
              <span>Slug</span>
              <code>{data.slug}</code>
            </div>
            <div className="menu-row">
              <span>Plano</span>
              <strong>{data.plan}</strong>
            </div>
            <div className="menu-row">
              <span>Status</span>
              <strong>{data.status}</strong>
            </div>
            <div className="menu-row">
              <span>Contato</span>
              <span>{data.contactEmail ?? '—'}</span>
            </div>
            <div className="menu-row">
              <span>Tenant ID</span>
              <code>{data.id}</code>
            </div>
          </>
        )}
      </div>
    </details>
  );
}
