import { useState, type FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrders, useEcommerceMutations, useCustomers } from './hooks';
import { ORDER_STATUSES, type OrderStatus, type Order } from './ecommerce.service';
import { formatDateTime, formatMoney } from '@/lib/format';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/types/api';

const PAGE_SIZE = 10;

const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  PENDING: 'badge-warning',
  CONFIRMED: 'badge-info',
  PROCESSING: 'badge-primary',
  SHIPPED: 'badge-success',
  DELIVERED: 'badge-success',
  CANCELED: 'badge-danger',
  REFUNDED: 'badge-neutral',
};

const PAYMENT_BADGE: Record<string, string> = {
  PENDING: 'badge-warning',
  PAID: 'badge-success',
  FAILED: 'badge-danger',
  REFUNDED: 'badge-neutral',
};

export function OrdersPage() {
  const { user } = useAuth();
    const canManage = user?.role === 'ADMIN' || user?.role === 'AGENT';

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | OrderStatus>('');
  const [page, setPage] = useState(1);

  const list = useOrders({ page, pageSize: PAGE_SIZE, status: status || undefined, q: search || undefined });
  const { createOrder, updateOrderStatus } = useEcommerceMutations();
  const customers = useCustomers();

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function changeStatus(value: string) {
    setPage(1);
    setStatus(value === '' ? '' : (value as OrderStatus));
  }

  function handleStatusChange(id: string, newStatus: OrderStatus) {
    updateOrderStatus.mutate({ id, status: newStatus });
  }

  function handleCreateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const customerId = String(form.elements.namedItem('customerId')?.valueOf() ?? '');
    const itemsRaw = (form.elements.namedItem('items') as HTMLInputElement)?.value ?? '';
    const notes = String(form.elements.namedItem('notes')?.valueOf() ?? '');

    if (!customerId) return;

    const items = itemsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [productId, quantity] = s.split(':');
        return { productId, quantity: Number(quantity) };
      });

    if (items.length === 0) return;

    createOrder.mutate({
      customerId,
      items,
      notes: notes || undefined,
    }, {
      onSuccess: () => form.reset(),
    });
  }

    const meta = list.data?.meta;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Pedidos</h1>
          <p>Gestão de pedidos do e-commerce ({meta ? `${meta.total} no total` : 'carregando…'}).</p>
        </div>
        {canManage && (
          <details className="panel">
            <summary className="panel-toggle">Novo pedido</summary>
            {createOrder.isError && createOrder.error instanceof ApiError && (
              <div className="alert alert-error">{createOrder.error.message}</div>
            )}
            <form className="form-grid" onSubmit={handleCreateOrder}>
              <label className="field">
                <span>Cliente *</span>
                <select className="select" name="customerId" required>
                  <option value="">Selecione…</option>
                  {customers.data?.rows?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} {c.email && `(${c.email})`}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Itens (productId:quantity, …) *</span>
                <input
                  className="input"
                  name="items"
                  placeholder='ex: abc-123:2, xyz-789:1'
                  required
                />
              </label>
              <label className="field field-full">
                <span>Observações</span>
                <textarea className="input" name="notes" rows={2} maxLength={5000} />
              </label>
              <div className="field-full">
                <button className="btn btn-primary" type="submit" disabled={createOrder.isPending}>
                  {createOrder.isPending ? 'Criando…' : 'Criar pedido'}
                </button>
              </div>
            </form>
          </details>
        )}
      </header>

      <form className="toolbar" onSubmit={applySearch}>
        <input
          className="input"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar por número, cliente…"
        />
        <select className="select" value={status} onChange={(e) => changeStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button className="btn btn-ghost" type="submit">Filtrar</button>
      </form>

      {list.isPending ? (
        <div className="page-state"><Spinner size={28} /></div>
      ) : list.isError ? (
        <div className="alert alert-error">Não foi possível carregar os pedidos.</div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th>Pagamento</th>
                  <th>Total</th>
                  <th>Criado em</th>
                  {canManage && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {list.data && list.data.rows.map((o: Order) => (
                  <tr key={o.id}>
                    <td><code>{o.number}</code></td>
                    <td>{o.customer?.name ?? '—'}</td>
                    <td>
                      <span className={`badge ${ORDER_STATUS_BADGE[o.status]}`}>{o.status}</span>
                    </td>
                    <td>
                      <span className={`badge ${PAYMENT_BADGE[o.paymentStatus] ?? 'badge-neutral'}`}>
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td>{formatMoney(o.total, 'BRL')}</td>
                    <td>{formatDateTime(o.createdAt)}</td>
                    {canManage && (
                      <td>
                        <select
                          className="select select-sm"
                          value={o.status}
                          onChange={(e) => handleStatusChange(o.id, e.target.value as OrderStatus)}
                          disabled={updateOrderStatus.isPending}
                        >
                          {ORDER_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
                {list.data && list.data.rows.length === 0 && (
                  <tr><td colSpan={canManage ? 7 : 6}>Nenhum pedido encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>Página {meta?.page ?? 1} de {meta?.totalPages ?? 1}</span>
            <div className="pagination-controls">
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >Anterior</button>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                disabled={!meta || page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >Próxima</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}