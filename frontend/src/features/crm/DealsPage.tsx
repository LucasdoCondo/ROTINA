import { useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCustomers, useDealFunnel, useDeals, useCrmMutations } from './hooks';
import { DEAL_STAGES, type CreateDealInput, type Deal, type DealStage } from './crm.service';
import { DEAL_STAGE_META, DEAL_STAGE_TRANSITIONS } from '@/lib/deal-stages';
import { formatDateTime, formatMoney } from '@/lib/format';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/types/api';

const PAGE_SIZE = 10;

/** Kanban por coluna: sempre as 6 colunas do pipeline, mesmo vazias. */
interface KanbanColumn {
  stage: DealStage;
  deals: Deal[];
  total: number;
}

function groupDealsByStage(rows: Deal[]): KanbanColumn[] {
  return DEAL_STAGES.map((stage) => {
    const deals = rows
      .filter((d) => d.stage === stage)
      .sort((a, b) => Number(b.value) - Number(a.value));
    return { stage, deals, total: deals.reduce((acc, d) => acc + Number(d.value), 0) };
  });
}

const STAGE_BADGE: Record<DealStage, string> = {
  QUALIFICATION: 'badge-status-in_progress',
  PROPOSAL: 'badge-priority-high',
  NEGOTIATION: 'badge-priority-high',
  WON: 'badge-success',
  LOST: 'badge-danger',
};

/** Rótulos solicitados no pedido → estágio real do backend. */
const KANBAN_REQUESTED_LABELS: Record<DealStage, string> = {
  LEAD: 'Lead',
  QUALIFICATION: 'Em Contato',
  PROPOSAL: 'Proposta',
  NEGOTIATION: 'Negociação',
  WON: 'Fechado',
  LOST: 'Perdido',
};

/**
 * Funil de vendas: agregação por estágio + lista de deals com
 * movimentação no pipeline (máquina de estados no backend).
 * Visão Kanban com as 6 colunas do pipeline + tabela operacional.
 */
export function DealsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [stage, setStage] = useState<'' | DealStage>('');
  const [page, setPage] = useState(1);

  const funnel = useDealFunnel();
  const list = useDeals({ page, pageSize: PAGE_SIZE, stage: stage || undefined });
  const customers = useCustomers({ page: 1, pageSize: 50 });
  const { createDeal, moveDeal, deleteDeal } = useCrmMutations();

  function changeStage(value: string) {
    setPage(1);
    setStage(value === '' ? '' : (value as DealStage));
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const customerId = String(data.get('customerId') ?? '').trim();
    const input: CreateDealInput = {
      customerId,
      title: String(data.get('title') ?? '').trim(),
      value: Number(data.get('value')),
      stage: (String(data.get('stage') ?? '') || undefined) as DealStage | undefined,
      probability: data.get('probability') === '' || data.get('probability') === null
        ? undefined
        : Number(data.get('probability')),
    };
    createDeal.mutate(input, { onSuccess: () => form.reset() });
  }

  function handleAdvance(deal: Deal, next: DealStage) {
    if (window.confirm(`Mover "${deal.title}" de ${deal.stage} para ${next}?`)) {
      moveDeal.mutate({ id: deal.id, stage: next });
    }
  }

  function handleDelete(deal: Deal) {
    if (window.confirm(`Excluir o deal "${deal.title}"? (soft delete — reversível no banco)`)) {
      deleteDeal.mutate(deal.id);
    }
  }

  const meta = list.data?.meta;
  const funnelStages = funnel.data?.stages ?? [];
  const maxCount = Math.max(1, ...funnelStages.map((s) => s.count));

  /** Kanban com os deals da página corrente (ordenados por valor na coluna). */
  const kanbanColumns = useMemo<KanbanColumn[]>(
    () => groupDealsByStage(list.data?.rows ?? []),
    [list.data],
  );
  const funnelPanel = (
    <section className="panel">
      <h2>Funil de vendas · visão geral</h2>
      {funnel.isPending ? (
        <Spinner size={22} />
      ) : funnel.isError ? (
        <p className="menu-empty">Não foi possível carregar o funil.</p>
      ) : (
        <>
          <p>
            {funnel.data.summary.openCount} em aberto ({formatMoney(funnel.data.summary.openValue, 'BRL')}) ·{' '}
            taxa de conversão: {funnel.data.summary.winRate.toFixed(0)}%
          </p>
          <div className="kanban" role="list" aria-label="Kanban do funil de vendas">
            {kanbanColumns.map((column) => (
              <div key={column.stage} className="kanban-column" role="listitem">
                <header className="kanban-column-head">
                  <strong>{column.meta.label}</strong>
                  <span className="kanban-count" title={`${column.deals.length} deal(s)`}>
                    {column.deals.length}
                  </span>
                </header>
                <span className="kanban-hint">{column.meta.hint}</span>
                <span className="kanban-total">{formatMoney(column.total, 'BRL')}</span>
                <div className="kanban-cards">
                  {column.deals.map((deal) => {
                    const transitions = DEAL_STAGE_TRANSITIONS[deal.stage];
                    return (
                      <article key={deal.id} className="kanban-card">
                        <strong className="kanban-card-title">{deal.title}</strong>
                        <span className="kanban-card-sub">{deal.customer.name}</span>
                        <span className="kanban-card-value">
                          {formatMoney(deal.value, deal.currency)}
                        </span>
                        {transitions.length > 0 ? (
                          <div className="kanban-card-actions">
                            {transitions.map((next) => (
                              <button
                                key={next}
                                className="btn btn-ghost btn-sm"
                                type="button"
                                disabled={moveDeal.isPending}
                                title={`Mover para ${DEAL_STAGE_META[next].label}`}
                                onClick={() => handleAdvance(deal, next)}
                              >
                                → {DEAL_STAGE_META[next].label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className={`badge ${STAGE_BADGE[deal.stage]}`}>
                            {DEAL_STAGE_META[deal.stage].label}
                          </span>
                        )}
                        {isAdmin && (
                          <button
                            className="btn btn-danger btn-sm kanban-delete"
                            type="button"
                            disabled={deleteDeal.isPending}
                            onClick={() => handleDelete(deal)}
                          >
                            Excluir
                          </button>
                        )}
                      </article>
                    );
                  })}
                  {column.deals.length === 0 && (
                    <p className="menu-empty">Nenhum deal neste estágio.</p>
                  )}
                </div>
                <div className="funnel-bar" aria-hidden="true">
                  <span style={{ width: `${(column.deals.length / maxCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );

  const filterBar = (
    <div className="toolbar">
      <select className="select" value={stage} onChange={(event) => changeStage(event.target.value)} aria-label="Filtrar por estágio">
        <option value="">Todos os estágios</option>
        {DEAL_STAGES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );

  const createForm = (    <details className="panel">
      <summary className="panel-toggle">Cadastrar novo deal</summary>
      {createDeal.isError && createDeal.error instanceof ApiError && (
        <div className="alert alert-error">
          {createDeal.error.status === 422
            ? 'Verifique os campos (valor não-negativo; probabilidade 0–100).'
            : createDeal.error.message}
        </div>
      )}
      <form onSubmit={handleCreate} className="form-grid">
        <label className="field">
          <span>Cliente *</span>
          <select className="select" name="customerId" required defaultValue="">
            <option value="" disabled>Selecione o cliente…</option>
            {customers.data?.rows.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Título *</span>
          <input className="input" name="title" minLength={2} maxLength={200} required placeholder="Escopo do negócio" />
        </label>
        <label className="field">
          <span>Valor (R$) *</span>
          <input className="input" name="value" type="number" min={0} max={9999999999.99} step="0.01" required placeholder="0,00" />
        </label>
        <label className="field">
          <span>Probabilidade (%)</span>
          <input className="input" name="probability" type="number" min={0} max={100} step={1} placeholder="Ex.: 60" />
        </label>
        <label className="field">
          <span>Estágio</span>
          <select className="select" name="stage" defaultValue="">
            <option value="">Padrão (LEAD)</option>
            {DEAL_STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <div className="field-full">
          <button className="btn btn-primary" type="submit" disabled={createDeal.isPending}>
            {createDeal.isPending ? 'Cadastrando…' : 'Cadastrar deal'}
          </button>
        </div>
      </form>
    </details>
  );

  return (
    <div className="page">
      {funnelPanel}
      {createForm}
      {filterBar}
      {(moveDeal.isError || deleteDeal.isError) && (
        <div className="alert alert-error">Operação não permitida ou transição de estágio inválida.</div>
      )}
      <section className="panel" aria-label="Kanban do pipeline">
        <h2>Kanban</h2>
        {list.isPending ? (
          <div className="page-state"><Spinner size={28} /></div>
        ) : list.isError ? (
          <div className="alert alert-error">Não foi possível carregar os deals.</div>
        ) : (
          <div className="kanban">
            {kanbanColumns.map((column) => (
              <div key={column.stage} className="kanban-col">
                <header className="kanban-col-head">
                  <span className={`badge ${STAGE_BADGE[column.stage]}`}>
                    {KANBAN_REQUESTED_LABELS[column.stage]}
                  </span>
                  <strong>{column.deals.length}</strong>
                </header>
                <div className="kanban-col-body">
                  {column.deals.map((deal) => (
                    <article key={deal.id} className="deal-card">
                      <strong>{deal.title}</strong>
                      <span className="deal-card-customer">{deal.customer.name}</span>
                      <span className="deal-card-value">{formatMoney(deal.value, deal.currency)}</span>
                      <div className="deal-card-actions">
                        {DEAL_STAGE_TRANSITIONS[deal.stage].map((next) => (
                          <button
                            key={next}
                            className="btn btn-ghost btn-sm"
                            type="button"
                            disabled={moveDeal.isPending}
                            onClick={() => handleAdvance(deal, next)}
                            title={
                              next === 'LOST'
                                ? 'Marcar como perdido'
                                : next === 'WON'
                                  ? 'Marcar como ganho'
                                  : `Mover para ${next}`
                            }
                          >
                            {next === 'WON' ? '✓' : next === 'LOST' ? '✕' : `→ ${next}`}
                          </button>
                        ))}
                      </div>
                    </article>
                  ))}
                  {column.deals.length === 0 && (
                    <p className="kanban-empty">Nenhum deal</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel" aria-label="Tabela de deals">
        <h2>Tabela operacional</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
                <tr>
                  <th>Título</th>
                  <th>Cliente</th>
                  <th>Valor</th>
                  <th>Estágio</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.data.rows.map((deal) => (
                  <tr key={deal.id}>
                    <td><strong>{deal.title}</strong></td>
                    <td>{deal.customer.name}</td>
                    <td>{formatMoney(deal.value, deal.currency)}</td>
                    <td><span className={`badge ${STAGE_BADGE[deal.stage]}`}>{deal.stage}</span></td>
                    <td>
                      <div className="actions">
                        {DEAL_STAGE_TRANSITIONS[deal.stage].map((next) => (
                          <button
                            key={next}
                            className="btn btn-ghost btn-sm"
                            type="button"
                            disabled={moveDeal.isPending}
                            onClick={() => handleAdvance(deal, next)}
                            title={
                              next === 'LOST'
                                ? 'Marcar como perdido'
                                : next === 'WON'
                                  ? 'Marcar como ganho'
                                  : `Mover para ${next}`
                            }
                          >
                            {next === 'WON' ? 'Ganhar' : next === 'LOST' ? 'Perder' : `→ ${next}`}
                          </button>
                        ))}
                        {isAdmin && (
                          <button
                            className="btn btn-danger"
                            type="button"
                            disabled={deleteDeal.isPending}
                            onClick={() => handleDelete(deal)}
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {list.data.rows.length === 0 && (
                  <tr><td colSpan={5}>Nenhum deal encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <span>Página {meta?.page ?? 1} de {meta?.totalPages ?? 1} ({meta?.total ?? 0} deals)</span>
            <div className="pagination-controls">
              <button className="btn btn-ghost btn-sm" type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </button>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                disabled={!meta || page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

