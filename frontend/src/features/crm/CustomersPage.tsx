import { useState, type FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCustomers, useCrmMutations } from './hooks';
import { CUSTOMER_STATUSES, type CreateCustomerInput, type CustomerStatus } from './crm.service';
import { formatDateTime } from '@/lib/format';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/types/api';

const PAGE_SIZE = 10;

const STATUS_BADGE: Record<CustomerStatus, string> = {
  LEAD: 'badge-info',
  PROSPECT: 'badge-status-in_progress',
  ACTIVE: 'badge-success',
  INACTIVE: 'badge-neutral',
  CHURNED: 'badge-danger',
};

/**
 * CRUD de Clientes (GET/POST/PATCH + soft delete ADMIN).
 * Filtros: status + busca textual. Paginação de 10 itens.
 */
export function CustomersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [status, setStatus] = useState<'' | CustomerStatus>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const list = useCustomers({ page, pageSize: PAGE_SIZE, status: status || undefined, q: search || undefined });
  const { createCustomer, deleteCustomer } = useCrmMutations();

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function changeStatus(value: string) {
    setPage(1);
    setStatus(value === '' ? '' : (value as CustomerStatus));
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const input: CreateCustomerInput = {
      name: String(data.get('name') ?? '').trim(),
      email: String(data.get('email') ?? '').trim() || null,
      phone: String(data.get('phone') ?? '').trim() || null,
      company: String(data.get('company') ?? '').trim() || null,
      document: String(data.get('document') ?? '').trim() || null,
      notes: String(data.get('notes') ?? '').trim() || null,
    };
    createCustomer.mutate(input, { onSuccess: () => form.reset() });
  }

  function handleDelete(id: string, name: string) {
    if (window.confirm(`Excluir o cliente "${name}"? (soft delete — reversível no banco)`)) {
      deleteCustomer.mutate(id);
    }
  }

  const meta = list.data?.meta;

  const createForm = (
    <details className="panel">
      <summary className="panel-toggle">Cadastrar novo cliente</summary>
      {createCustomer.isError && createCustomer.error instanceof ApiError && (
        <div className="alert alert-error">
          {createCustomer.error.status === 422
            ? 'Verifique os campos (nome mínimo 2 caracteres; CPF/CNPJ só dígitos).'
            : createCustomer.error.message}
        </div>
      )}
      <form onSubmit={handleCreate} className="form-grid">
        <label className="field">
          <span>Nome *</span>
          <input className="input" name="name" minLength={2} maxLength={255} required placeholder="Nome do contato" />
        </label>
        <label className="field">
          <span>Empresa</span>
          <input className="input" name="company" maxLength={255} placeholder="Empresa do cliente" />
        </label>
        <label className="field">
          <span>E-mail</span>
          <input className="input" name="email" type="email" maxLength={255} placeholder="contato@empresa.com" />
        </label>
        <label className="field">
          <span>Telefone</span>
          <input className="input" name="phone" minLength={5} maxLength={40} placeholder="(11) 99999-9999" />
        </label>
        <label className="field">
          <span>CPF/CNPJ (só dígitos)</span>
          <input
            className="input"
            name="document"
            inputMode="numeric"
            pattern="\d{11}|\d{14}"
            title="CPF com 11 dígitos ou CNPJ com 14 dígitos, sem máscara"
            placeholder="11 ou 14 dígitos"
          />
        </label>
        <label className="field field-full">
          <span>Observações</span>
          <textarea className="input" name="notes" rows={3} maxLength={5000} placeholder="Contexto do cliente…" />
        </label>
        <div className="field-full">
          <button className="btn btn-primary" type="submit" disabled={createCustomer.isPending}>
            {createCustomer.isPending ? 'Cadastrando…' : 'Cadastrar cliente'}
          </button>
        </div>
      </form>
    </details>
  );

  const filterBar = (
    <form className="toolbar" onSubmit={applySearch}>
      <input
        className="input"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder="Buscar nome/empresa/e-mail…"
      />
      <select className="select" value={status} onChange={(event) => changeStatus(event.target.value)}>
        <option value="">Todos os status</option>
        {CUSTOMER_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <button className="btn btn-ghost" type="submit">Filtrar</button>
    </form>
  );

  const body = list.isPending ? (
    <div className="page-state"><Spinner size={28} /></div>
  ) : list.isError ? (
    <div className="alert alert-error">Não foi possível carregar os clientes.</div>
  ) : (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Empresa</th>
              <th>Status</th>
              <th>Deals</th>
              <th>Criado em</th>
              {isAdmin && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {list.data.rows.map((customer) => (
              <tr key={customer.id}>
                <td>
                  <strong>{customer.name}</strong>
                  {customer.email && <div className="stat-hint">{customer.email}</div>}
                </td>
                <td>{customer.company ?? '—'}</td>
                <td><span className={`badge ${STATUS_BADGE[customer.status]}`}>{customer.status}</span></td>
                <td>{customer._count.deals}</td>
                <td>{formatDateTime(customer.createdAt)}</td>
                {isAdmin && (
                  <td>
                    <div className="actions">
                      <button
                        className="btn btn-danger"
                        type="button"
                        disabled={deleteCustomer.isPending}
                        onClick={() => handleDelete(customer.id, customer.name)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {list.data.rows.length === 0 && (
              <tr><td colSpan={isAdmin ? 6 : 5}>Nenhum cliente encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <span>Página {meta?.page ?? 1} de {meta?.totalPages ?? 1} ({meta?.total ?? 0} clientes)</span>
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
  );

  return (
    <div className="page">
      {createForm}
      {filterBar}
      {body}
    </div>
  );
}

