import { useAuth } from '@/hooks/useAuth';
import { useCancelSubscription, useCheckout, useSubscription } from './hooks';
import { PLANS, type TenantPlan } from './payments.service';
import { formatMoney } from '@/lib/format';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/types/api';

const PLAN_BADGE: Record<TenantPlan, string> = {
  FREE: 'badge-neutral',
  STARTER: 'badge-info',
  PROFESSIONAL: 'badge-primary',
  ENTERPRISE: 'badge-success',
};

/** Página de Planos & Assinatura (admin) com checkout do gateway. */
export function SubscriptionPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const subscription = useSubscription();
  const checkout = useCheckout();
  const cancel = useCancelSubscription();

  if (subscription.isPending) {
    return (
      <div className="page">
        <div className="page-state"><Spinner size={28} /></div>
      </div>
    );
  }

  if (subscription.isError || !subscription.data) {
    return (
      <div className="page">
        <div className="alert alert-error">Não foi possível carregar a assinatura.</div>
      </div>
    );
  }

  const { subscription: sub, tenantPlan } = subscription.data;
  const currentPlan = sub.plan;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Planos & Assinatura</h1>
          <p>
            Plano atual:{' '}
            <span className={`badge ${PLAN_BADGE[currentPlan]}`}>{currentPlan}</span>
            {' · '}Status:{' '}
            <span className="badge badge-status-in_progress">{sub.status}</span>
            {sub.cancelAtPeriodEnd && (
              <> · <span className="badge badge-warning">cancelamento no fim do período</span></>
            )}
          </p>
          {sub.provider !== 'MANUAL' && (
            <p className="stat-hint">
              Gateway: {sub.provider.toLowerCase()} · período até{' '}
              {new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
        {isAdmin && currentPlan !== 'FREE' && !sub.cancelAtPeriodEnd && (
          <button
            className="btn btn-danger"
            type="button"
            disabled={cancel.isPending}
            onClick={() => {
              if (window.confirm('Cancelar a assinatura no fim do período atual?')) {
                cancel.mutate();
              }
            }}
          >
            {cancel.isPending ? 'Cancelando…' : 'Cancelar assinatura'}
          </button>
        )}
      </header>

      {checkout.isError && checkout.error instanceof ApiError && (
        <div className="alert alert-error">{checkout.error.message}</div>
      )}
      {checkout.data?.checkoutUrl && (
        <div className="alert alert-success">
          Redirecionando para o pagamento…{' '}
          <a href={checkout.data.checkoutUrl}>Abrir checkout</a>
        </div>
      )}

      <div className="plan-grid">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isDowngrade = !isCurrent && currentPlan !== 'FREE';
          return (
            <article
              key={plan.id}
              className={`plan-card ${isCurrent ? 'plan-card-active' : ''}`}
            >
              <h3>{plan.name}</h3>
              <div className="plan-price">
                <strong>{formatMoney(plan.price, 'BRL')}</strong>
                <span>/mês</span>
              </div>
              <ul className="plan-features">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {isCurrent ? (
                <button className="btn" type="button" disabled>
                  Plano atual
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={!isAdmin || !tenantPlan}
                  onClick={() => {
                    checkout.mutate({ plan: plan.id });
                  }}
                >
                  {checkout.isPending ? 'Processando…' : `Assinar ${plan.name}`}
                  {isDowngrade ? ' (mudar)' : ''}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}