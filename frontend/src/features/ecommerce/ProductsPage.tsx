import { useState, type FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProducts, useEcommerceMutations } from './hooks';
import { PRODUCT_STATUSES, type ProductStatus } from './ecommerce.service';
import { formatDateTime, formatMoney } from '@/lib/format';
import { Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/types/api';

const PAGE_SIZE = 10;

const STATUS_BADGE: Record<ProductStatus, string> = {
  DRAFT: 'badge-neutral',
  ACTIVE: 'badge-success',
  ARCHIVED: 'badge-info',
  OUT_OF_STOCK: 'badge-danger',
};

export function ProductsPage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'ADMIN' || user?.role === 'AGENT';
  const isAdmin = user?.role === 'ADMIN';
  const [status, setStatus] = useState<'' | ProductStatus>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const list = useProducts({ page, pageSize: PAGE_SIZE, status: status || undefined, q: search || undefined });
  const { createProduct, deleteProduct, updateProduct } = useEcommerceMutations();

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function changeStatus(value: string) {
    setPage(1);
    setStatus(value === '' ? '' : (value as ProductStatus));
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    createProduct.mutate({
      name: String(data.get('name') ?? '').trim(),
      slug: String(data.get('slug') ?? '').trim().toLowerCase(),
      price: Number(data.get('price')),
      stock: Number(data.get('stock')) || 0,
      status: (String(data.get('status') ?? '') || 'DRAFT') as ProductStatus,
      sku: String(data.get('sku') ?? '').trim() || undefined,
      description: String(data.get('description') ?? '').trim() || undefined,
    }, { onSuccess: () => form.reset() });
  }

  function handleDelete(id: string, name: string) {
    if (window.confirm(`Excluir o produto "${name}?"`)) {
      deleteProduct.mutate(id);
    }
  }

  function handleQuickStatus(id: string, current: ProductStatus) {
    if (!isAdmin) return;
    const next = current === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    updateProduct.mutate({ id, input: { status: next } });
  }

  const meta = list.data?.meta;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Produtos</h1>
          <p>Catálogo de produtos do tenant ({meta ? `${meta.total} no total` : 'carregando…'}).</p>
        </div>
        {isStaff && (
          <details className="panel">
            <summary className="panel-toggle">Cadastrar novo produto</summary>
            {createProduct.isError && createProduct.error instanceof ApiError && (
              <div className="alert alert-error">
                {createProduct.error.status === 409 ? 'Slug já existe.' : createProduct.error.message}
              </div>
            )}
            <form onSubmit={handleCreate} className="form-grid">
              <label className="field">
                <span>Nome *</span>
                <input className="input" name="name" minLength={2} maxLength={255} required />
              </label>
              <label className="field">
                <span>Slug *</span>
                <input className="input" name="slug" minLength={3} maxLength={255} required placeholder="nome-do-produto" />
              </label>
              <label className="field">
                <span>SKU</span>
                <input className="input" name="sku" maxLength={100} />
              </label>
              <label className="field">
                <span>Preço (R$) *</span>
                <input className="input" name="price" type="number" min="0" step="0.01" required />
              </label>
              <label className="field">
                <span>Estoque</span>
                <input className="input" name="stock" type="number" min="0" defaultValue={0} />
              </label>
              <label className="field">
                <span>Status</span>
                <select className="select" name="status" defaultValue="DRAFT">
                  {PRODUCT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="field field-full">
                <span>Descrição</span>
                <textarea className="input" name="description" rows={2} maxLength={5000} />
              </label>
              <div className="field-full">
                <button className="btn btn-primary" type="submit" disabled={createProduct.isPending}>
                  {createProduct.isPending ? 'Cadastrando…' : 'Cadastrar produto'}
                </button>
              </div>
            </form>
          </details>
        )}
            </header>

      <form className="toolbar" onSubmit={applySearch}>
        <input className="input" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Buscar nome/sku…" />
        <select className="select" value={status} onChange={(e) => changeStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {PRODUCT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button className="btn btn-ghost" type="submit">Filtrar</button>
      </form>

      {list.isPending ? (
        <div className="page-state"><Spinner size={28} /></div>
      ) : list.isError ? (
        <div className="alert alert-error">Não foi possível carregar os produtos.</div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th><th>SKU</th><th>Preço</th><th>Estoque</th><th>Status</th><th>Criado em</th>{isAdmin && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {list.data && list.data.rows.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.sku ? <code>{p.sku}</code> : '—'}</td>
                    <td>{formatMoney(p.price, 'BRL')}</td>
                    <td>{p.stock}</td>
                    <td><span className={`badge ${STATUS_BADGE[p.status]}`}>{p.status}</span></td>
                    <td>{formatDateTime(p.createdAt)}</td>
                    {isAdmin && (
                      <td>
                        <div className="actions">
                          {p.status !== 'OUT_OF_STOCK' && (
                            <button
                              className="btn btn-sm btn-ghost"
                              type="button"
                              title={p.status === 'ACTIVE' ? 'Arquivar' : 'Ativar'}
                              onClick={() => handleQuickStatus(p.id, p.status)}
                            >
                              {p.status === 'ACTIVE' ? '🔒' : '🔓'}
                            </button>
                          )}
                          <button
                            className="btn btn-danger btn-sm"
                            type="button"
                            disabled={deleteProduct.isPending}
                            onClick={() => handleDelete(p.id, p.name)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {list.data && list.data.rows.length === 0 && (
                  <tr><td colSpan={isAdmin ? 7 : 6}>Nenhum produto encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>Página {meta?.page ?? 1} de {meta?.totalPages ?? 1}</span>
            <div className="pagination-controls">
              <button className="btn btn-ghost btn-sm" type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
              <button className="btn btn-ghost btn-sm" type="button" disabled={!meta || page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}