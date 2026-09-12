import { useState, type FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMembers, useMemberMutations } from './hooks';
import {
  MEMBER_STATUSES,
  PLAN_TYPES,
  type MemberStatus,
  type PlanType,
} from './members.service';
import { formatDateTime } from '@/lib/format';
import { Spinner } from '@/components/ui/Spinner';
import { ROLE_LABEL } from '@/types/api';

const PAGE_SIZE = 10;

const STATUS_BADGE: Record<MemberStatus, string> = {
  ACTIVE: 'badge-success',
  INACTIVE: 'badge-neutral',
  SUSPENDED: 'badge-danger',
};

const PLAN_BADGE: Record<PlanType, string> = {
  FREE: 'badge-plan-free',
  STARTER: 'badge-plan-starter',
  PROFESSIONAL: 'badge-plan-professional',
  ENTERPRISE: 'badge-plan-enterprise',
};

export function MembersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [status, setStatus] = useState<'' | MemberStatus>('');
  const [plan, setPlan] = useState<'' | PlanType>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const list = useMembers({
    page,
    pageSize: PAGE_SIZE,
    status: status || undefined,
    plan: plan || undefined,
    q: search || undefined,
  });
  const { suspend, activate, remove } = useMemberMutations();

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function changeStatus(value: string) {
    setPage(1);
    setStatus(value === '' ? '' : (value as MemberStatus));
  }

  function changePlan(value: string) {
    setPage(1);
    setPlan(value === '' ? '' : (value as PlanType));
  }

  function handleSuspend(id: string, name: string) {
    if (window.confirm(`Suspender o membro "${name}"?`)) {
      suspend.mutate(id);
    }
  }

  function handleActivate(id: string, name: string) {
    if (window.confirm(`Reativar o membro "${name}"?`)) {
      activate.mutate(id);
    }
  }

  function handleDelete(id: string, name: string) {
    if (window.confirm(`Excluir o membro "${name}"? (soft delete — irreversível na UI)`)) {
      remove.mutate(id);
    }
  }

  const meta = list.data?.meta;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Membros</h1>
          <p>Gestão de membros e assinaturas do tenant ({meta ? `${meta.total} no total` : 'carregando…'}).</p>
        </div>
      </header>

      <form className="toolbar" onSubmit={applySearch}>
        <input
          className="input"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Buscar nome/e-mail…"
        />
        <select className="select" value={status} onChange={(event) => changeStatus(event.target.value)}>
          <option value="">Todos os status</option>
          {MEMBER_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select className="select" value={plan} onChange={(event) => changePlan(event.target.value)}>
          <option value="">Todos os planos</option>
          {PLAN_TYPES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <button className="btn btn-ghost" type="submit">Filtrar</button>
      </form>

      {list.isPending ? (
        <div className="page-state"><Spinner size={28} /></div>
      ) : list.isError ? (
        <div className="alert alert-error">Não foi possível carregar os membros.</div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th>Plano</th>
                  <th>Assinatura</th>
                  <th>Criado em</th>
                  {isAdmin && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {list.data && list.data.rows.map((member) => (
                  <tr key={member.id}>
                    <td><strong>{member.name}</strong></td>
                    <td>{member.email}</td>
                    <td><span className={`badge role-${member.role.toLowerCase()}`}>{ROLE_LABEL[member.role]}</span></td>
                    <td><span className={`badge ${STATUS_BADGE[member.status]}`}>{member.status}</span></td>
                    <td>
                      {member.subscription ? (
                        <span className={`badge ${PLAN_BADGE[member.subscription.plan]}`}>{member.subscription.plan}</span>
                      ) : (
                        <span className="badge badge-plan-free">—</span>
                      )}
                    </td>
                    <td>
                      {member.subscription ? (
                        <span className={`badge ${member.subscription.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                          {member.subscription.status}
                        </span>
                      ) : (
                        <span className="badge badge-neutral">Sem assinatura</span>
                      )}
                    </td>
                    <td>{formatDateTime(member.createdAt)}</td>
                    {isAdmin && (
                      <td>
                        <div className="actions">
                          {member.status === 'ACTIVE' ? (
                            <button className="btn btn-ghost btn-sm" type="button" disabled={suspend.isPending} onClick={() => handleSuspend(member.id, member.name)}>Suspender</button>
                          ) : (
                            <button className="btn btn-ghost btn-sm" type="button" disabled={activate.isPending} onClick={() => handleActivate(member.id, member.name)}>Reativar</button>
                          )}
                          <button className="btn btn-danger btn-sm" type="button" disabled={remove.isPending} onClick={() => handleDelete(member.id, member.name)}>Excluir</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
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
