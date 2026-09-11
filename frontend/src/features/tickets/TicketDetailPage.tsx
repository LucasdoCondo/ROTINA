import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTicket, useTicketMessages, useTicketMutations } from './hooks';
import { TICKET_STATUSES, type TicketStatus } from './tickets.service';
import { formatDateTime } from '@/lib/format';
import { FullPageSpinner, Spinner } from '@/components/ui/Spinner';
import { ApiError } from '@/types/api';

/**
 * Detalhe do chamado: cabeçalho + transição de status (staff) +
 * histórico de interações (append-only) e nova mensagem.
 * O histórico usa polling leve (15s) para refletir interações de outros
 * usuários sem refresh manual — o backend não expõe WebSocket/SSE.
 * MEMBER: acesso apenas aos próprios tickets e sem notas internas (RBAC no backend).
 */
export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isStaff = user?.role === 'ADMIN' || user?.role === 'AGENT';

  const ticketQuery = useTicket(id);
  // Quase-tempo-real via polling: suficiente para chat de suporte sem infra WS.
  const messagesQuery = useTicketMessages(id, 15_000);
  const { update, addMessage } = useTicketMutations();

  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);

  if (ticketQuery.isPending) {
    return <FullPageSpinner />;
  }

  if (ticketQuery.isError || !ticketQuery.data) {
    return (
      <div className="page-state">
        <h1>404</h1>
        <p>Chamado não encontrado ou sem acesso.</p>
        <Link className="btn btn-primary" to="/tickets">Voltar aos chamados</Link>
      </div>
    );
  }

  const ticket = ticketQuery.data;

  function handleStatusChange(value: string) {
    if (id && value) {
      update.mutate({ id, input: { status: value as TicketStatus } });
    }
  }

  function handleSubmitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || !body.trim()) return;
    addMessage.mutate(
      { id, input: { body: body.trim(), isInternal: isStaff && internal } },
      {
        onSuccess: () => {
          setBody('');
          setInternal(false);
        },
      },
    );
  }

  const mutationError =
    (update.isError && update.error instanceof ApiError && update.error.message) ||
    (addMessage.isError && addMessage.error instanceof ApiError && addMessage.error.message) ||
    null;

  return (
    <div className="page">
      <Link className="back-link" to="/tickets">← Voltar aos chamados</Link>

      <header className="page-header">
        <div>
          <h1>
            <code>{ticket.protocol}</code> · {ticket.subject}
          </h1>
          <p>
            <span className={`badge badge-status-${ticket.status.toLowerCase()}`}>{ticket.status}</span>{' '}
            <span className={`badge badge-priority-${ticket.priority.toLowerCase()}`}>{ticket.priority}</span>{' '}
            <span className="badge badge-plan-free">{ticket.category}</span>
          </p>
        </div>
        {isStaff && (
          <label className="field status-change">
            <span>Alterar status</span>
            <select
              className="select"
              value={ticket.status}
              onChange={(event) => handleStatusChange(event.target.value)}
              disabled={update.isPending}
            >
              {TICKET_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        )}
      </header>

      {mutationError && <div className="alert alert-error">{mutationError}</div>}

      <section className="panel">
        <h2>Descrição</h2>
        <p className="msg-body">{ticket.description}</p>
        <div className="meta-row">
          <span>Abrido por <strong>{ticket.creator.name}</strong> em {formatDateTime(ticket.createdAt)}</span>
          {ticket.customer && <span>Cliente: <strong>{ticket.customer.name}</strong></span>}
        </div>
      </section>

      <section className="panel">
        <h2>
          Histórico ({messagesQuery.data?.length ?? 0})
          {messagesQuery.isFetching && !messagesQuery.isPending && (
            <span className="stat-hint"> · atualizando…</span>
          )}
        </h2>
        {messagesQuery.isPending ? (
          <Spinner size={22} />
        ) : messagesQuery.isError ? (
          <p className="menu-empty">Não foi possível carregar o histórico.</p>
        ) : (
          <div className="msg-list">
            {messagesQuery.data?.map((message) => (
              <article key={message.id} className={`msg${message.isInternal ? ' msg-internal' : ''}`}>
                <div className="msg-head">
                  <strong>{message.author?.name ?? 'Sistema'}</strong>
                  <span>· {formatDateTime(message.createdAt)}</span>
                  {message.isInternal && <span className="badge badge-internal">nota interna</span>}
                </div>
                <p className="msg-body">{message.body}</p>
              </article>
            ))}
            {messagesQuery.data?.length === 0 && (
              <p className="menu-empty">Nenhuma interação ainda.</p>
            )}
          </div>
        )}

        <form className="msg-form" onSubmit={handleSubmitMessage}>
          <textarea
            className="input"
            rows={3}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={isStaff ? 'Responder ou registrar nota interna…' : 'Responder ao time de suporte…'}
            required
          />
          <div className="msg-form-actions">
            {isStaff && (
              <label className="checkbox">
                <input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} />
                Nota interna (visível apenas para a equipe)
              </label>
            )}
            <button className="btn btn-primary" type="submit" disabled={addMessage.isPending || !body.trim()}>
              {addMessage.isPending ? 'Enviando…' : 'Enviar interação'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
