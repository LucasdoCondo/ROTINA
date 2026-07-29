/**
 * AuditLogTable - Componente reutilizável de Tabela de Auditoria
 *
 * Lista eventos de auditoria em uma tabela interativa com badges de status
 * e acionador para modal de detalhes com visualizador de diff side-by-side.
 *
 * @param {Object} props
 * @param {Array} props.logs - Array de logs de auditoria
 */
import { useState } from 'react';
import { DiffViewer } from './DiffViewer';
import { Eye, User, Laptop, X } from 'lucide-react';
import './audit-log-table.css';

const actionStyles = {
  CREATE: { label: 'Criação', className: 'alt-action-create' },
  UPDATE: { label: 'Edição', className: 'alt-action-update' },
  DELETE: { label: 'Exclusão', className: 'alt-action-delete' },
  LOGIN: { label: 'Login', className: 'alt-action-login' },
  LOGOUT: { label: 'Logout', className: 'alt-action-logout' },
  EXPORT: { label: 'Exportação', className: 'alt-action-export' },
};

export function AuditLogTable({ logs }) {
  const [selectedLog, setSelectedLog] = useState(null);

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString('pt-BR');
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <div className="alt-wrapper">
        <table className="alt-table">
          <thead>
            <tr>
              <th>Ação</th>
              <th>Entidade</th>
              <th>Usuário</th>
              <th>Data & Hora</th>
              <th className="alt-text-right">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="alt-empty">
                  Nenhum registro de auditoria encontrado.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const config = actionStyles[log.action] || {
                  label: log.action,
                  className: 'alt-action-default',
                };

                return (
                  <tr key={log.id}>
                    <td>
                      <span className={`alt-badge ${config.className}`}>
                        {config.label}
                      </span>
                    </td>
                    <td className="alt-entity-cell">
                      <span className="alt-entity-name">{log.entity}</span>
                      {log.entityId && (
                        <span className="alt-entity-id">ID: {log.entityId}</span>
                      )}
                    </td>
                    <td>
                      <span className="alt-user-cell">
                        <User size={14} className="alt-user-icon" />
                        {log.userEmail || 'Sistema (Automático)'}
                      </span>
                    </td>
                    <td className="alt-date-cell">{formatDate(log.createdAt)}</td>
                    <td className="alt-text-right">
                      <button
                        className="alt-btn-details"
                        onClick={() => setSelectedLog(log)}
                        disabled={!log.oldValues && !log.newValues}
                      >
                        <Eye size={16} />
                        Ver Alterações
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal / Dialog de Inspeção de Diff */}
      {selectedLog && (
        <div className="alt-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="alt-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="alt-modal-header">
              <h2>Detalhes da Alteração — {selectedLog.entity}</h2>
              <button
                className="alt-modal-close"
                onClick={() => setSelectedLog(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="alt-modal-body">
              <p className="alt-modal-description">
                Comparativo de valores antes e depois da operação de{' '}
                <strong>{selectedLog.action}</strong>.
              </p>

              {/* Metadados adicionais do Log */}
              <div className="alt-metadata">
                <div>
                  <strong>Usuário:</strong> {selectedLog.userEmail || 'Sistema'}
                </div>
                {selectedLog.ipAddress && (
                  <div className="alt-metadata-ip">
                    <Laptop size={14} />
                    <strong>IP:</strong> {selectedLog.ipAddress}
                  </div>
                )}
              </div>

              {/* Renderização do Diff */}
              <DiffViewer
                oldValues={selectedLog.oldValues}
                newValues={selectedLog.newValues}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}