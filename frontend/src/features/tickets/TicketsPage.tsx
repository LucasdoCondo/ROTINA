import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets, useTicketMutations } from './hooks';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type CreateTicketInput,
  type TicketPriority,
  type TicketStatus,
} from './tickets.service';
import { formatDateTime } from '@/lib/format';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/types/api';

const PAGE_SIZE = 10;

/**
 * Listagem de chamados com filtros (status + prioridade + busca) e paginação.
 * Criação via POST /tickets — o protocolo (TKT-<ano>-<nº>) é gerado no backend.
 */
export function TicketsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'' | TicketStatus>('');
  const [priority, setPriority] = useState<'' | TicketPriority>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const list = useTickets({
    page,
    pageSize: PAGE_SIZE,
    status: status || undefined,
    priority: priority || undefined,
    q: search || undefined,
  });
  const { create } = useTicketMutations();

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function changeStatus(value: string) {
    setPage(1);
    setStatus(value === '' ? '' : (value as TicketStatus));
  }

  function changePriority(value: string) {
    setPage(1);
    setPriority(value === '' ? '' : (value as TicketPriority));
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const input: CreateTicketInput = {
      subject: String(data.get('subject') ?? '').trim(),
      description: String(data.get('description') ?? '').trim(),
      priority: (String(data.get('priority') ?? '') || undefined) as CreateTicketInput['priority'],
      category: (String(data.get('category') ?? '') || undefined) as CreateTicketInput['category'],
    };
    create.mutate(input, { onSuccess: () => form.reset() });
  }

  const meta = list.data?.meta;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Chamados</h1>
          <p>Suporte e demandas do tenant ({meta ? `${meta.total} no total` : 'carregando…'}).</p>
        </div>
      </header>

      <details className="panel">
        <summary className="panel-toggle">Abrir novo chamado</summary>
        {create.isError && create.error instanceof ApiError && (
          <div className="alert alert-error">
            {create.error.status === 422 ? 'Verifique os campos informados.' : create.error.message}
          </div>
        )}
        <form onSubmit={handleCreate} className="form-grid">
          <label className="field field-full">
            <span>Assunto</span>
            <input className="input" name="subject" minLength={3} maxLength={200} required placeholder="Resumo do problema" />
          </label>
          <label className="field">
            <span>Prioridade</span>
            <select className="select" name="priority" defaultValue="">
              <option value="">Padrão (MEDIUM)</option>
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Categoria</span>
            <select className="select" name="category" defaultValue="">
              <option value="">Padrão (OTHER)</option>
              {TICKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="field field-full">
            <span>Descrição</span>
            <textarea className="input" name="description" rows={4} minLength={10} maxLength={10_000} required placeholder="Detalhe o problema (mínimo 10 caracteres)" />
          </label>
          <div className="field-full">
            <button className="btn btn-primary" type="submit" disabled={create.isPending}>
              {create.isPending ? 'Abrindo…' : 'Abrir chamado'}
            </button>
          </div>
        </form>
      </details>

      <form className="toolbar" onSubmit={applySearch}>
        <input
          className="input"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Buscar assunto/descrição…"
        />
        <select className="select" value={status} onChange={(event) => changeStatus(event.target.value)} aria-label="Filtrar por status">
          <option value="">Todos os status</option>
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select className="select" value={priority} onChange={(event) => changePriority(event.target.value)} aria-label="Filtrar por prioridade">
          <option value="">Todas as prioridades</option>
          {TICKET_PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <button className="btn btn-ghost" type="submit">Filtrar</button>
      </form>

      {list.isPending ? (
        <div className="page-state"><Spinner size={28} /></div>
      ) : list.isError ? (
        <div className="alert alert-error">Não foi possível carregar os chamados.</div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Protocolo</th>
                  <th>Assunto</th>
                  <th>Status</th>
                  <th>Prioridade</th>
                  <th>Atendente</th>
                  <th>Criado em</th>
                </tr>
              </thead>
              <tbody>
                {list.data.rows.map((ticket) => (
                  <tr key={ticket.id} data-clickable="true" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                    <td><code>{ticket.protocol}</code></td>
                    <td>{ticket.subject}</td>
                    <td><span className={`badge badge-status-${ticket.status.toLowerCase()}`}>{ticket.status}</span></td>
                    <td><span className={`badge badge-priority-${ticket.priority.toLowerCase()}`}>{ticket.priority}</span></td>
                    <td>{ticket.assignee?.name ?? '—'}</td>
                    <td>{formatDateTime(ticket.createdAt)}</td>
                  </tr>
                ))}
                {list.data.rows.length === 0 && (
                  <tr><td colSpan={6}>Nenhum chamado encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <span>
              Página {meta?.page ?? 1} de {meta?.totalPages ?? 1}
            </span>
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
