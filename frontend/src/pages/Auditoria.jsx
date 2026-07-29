import { useState, useEffect, useCallback } from 'react';
import { auditoriaService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  History,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DiffViewer } from '../components/audit/DiffViewer';
import './Auditoria.css';

export const Auditoria = () => {
  const { user } = useAuth();
  const isAdmin = user?.cargo === 'ADMIN';

  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [estatisticas, setEstatisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filtros
  const [filtros, setFiltros] = useState({
    action: '',
    entity: '',
    userId: '',
    startDate: '',
    endDate: '',
  });

  // Modal de diff
  const [logSelecionado, setLogSelecionado] = useState(null);

  // Modal de retenção
  const [showRetentionModal, setShowRetentionModal] = useState(false);
  const [retentionDays, setRetentionDays] = useState(365);
  const [purging, setPurging] = useState(false);

  const carregarLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filtros,
      };
      // Remover filtros vazios
      Object.keys(params).forEach((key) => {
        if (!params[key]) delete params[key];
      });

      const response = await auditoriaService.listar(params);
      setLogs(response.data.logs);
      setPagination(response.data.pagination);
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao carregar logs';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filtros]);

  const carregarEstatisticas = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await auditoriaService.estatisticas();
      setEstatisticas(response.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarLogs();
  }, [carregarLogs]);

  useEffect(() => {
    carregarEstatisticas();
  }, [carregarEstatisticas]);

  const aplicarFiltros = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    carregarLogs();
  };

  const limparFiltros = () => {
    setFiltros({
      action: '',
      entity: '',
      userId: '',
      startDate: '',
      endDate: '',
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handlePurge = async () => {
    if (retentionDays < 30) {
      toast.error('O período mínimo de retenção é 30 dias');
      return;
    }

    setPurging(true);
    try {
      const response = await auditoriaService.purgeOldLogs(retentionDays);
      toast.success(response.data.message);
      setShowRetentionModal(false);
      carregarLogs();
      carregarEstatisticas();
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao remover logs antigos';
      toast.error(message);
    } finally {
      setPurging(false);
    }
  };

  const getActionBadge = (action) => {
    const classes = {
      CREATE: 'action-create',
      UPDATE: 'action-update',
      DELETE: 'action-delete',
      LOGIN: 'action-login',
      LOGOUT: 'action-logout',
      EXPORT: 'action-export',
    };
    return classes[action] || 'action-default';
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="auditoria">
      {/* Header */}
      <div className="auditoria-header">
        <div>
          <h1>
            <History size={28} />
            Trilha de Auditoria
          </h1>
          <p className="auditoria-subtitle">
            Registro de todas as ações realizadas no sistema
          </p>
        </div>
        {isAdmin && (
          <button
            className="btn-retention"
            onClick={() => setShowRetentionModal(true)}
            title="Remover logs antigos"
          >
            <Trash2 size={18} />
            Retenção de Logs
          </button>
        )}
      </div>

      {/* Estatísticas */}
      {!statsLoading && estatisticas && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon stat-total">
              <History size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-title">Total de Registros</p>
              <p className="stat-value">{estatisticas.total}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-today">
              <AlertTriangle size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-title">Registros Hoje</p>
              <p className="stat-value">{estatisticas.hoje}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-week">
              <History size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-title">Últimos 7 dias</p>
              <p className="stat-value">{estatisticas.ultimos7dias}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <form className="filtros-card" onSubmit={aplicarFiltros}>
        <div className="filtros-header">
          <Filter size={18} />
          <h3>Filtros</h3>
        </div>
        <div className="filtros-grid">
          <div className="filtro-item">
            <label>Ação</label>
            <select
              value={filtros.action}
              onChange={(e) => setFiltros({ ...filtros, action: e.target.value })}
            >
              <option value="">Todas</option>
              <option value="CREATE">Criação</option>
              <option value="UPDATE">Atualização</option>
              <option value="DELETE">Exclusão</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="EXPORT">Exportação</option>
            </select>
          </div>
          <div className="filtro-item">
            <label>Entidade</label>
            <select
              value={filtros.entity}
              onChange={(e) => setFiltros({ ...filtros, entity: e.target.value })}
            >
              <option value="">Todas</option>
              <option value="Client">Cliente</option>
              <option value="Product">Produto</option>
              <option value="Order">Pedido</option>
              <option value="Ticket">Chamado</option>
              <option value="User">Usuário</option>
              <option value="MemberSubscription">Membro</option>
            </select>
          </div>
          <div className="filtro-item">
            <label>Data Inicial</label>
            <input
              type="date"
              value={filtros.startDate}
              onChange={(e) => setFiltros({ ...filtros, startDate: e.target.value })}
            />
          </div>
          <div className="filtro-item">
            <label>Data Final</label>
            <input
              type="date"
              value={filtros.endDate}
              onChange={(e) => setFiltros({ ...filtros, endDate: e.target.value })}
            />
          </div>
        </div>
        <div className="filtros-actions">
          <button type="submit" className="btn-filtrar">
            <Search size={16} />
            Filtrar
          </button>
          <button type="button" className="btn-limpar" onClick={limparFiltros}>
            <X size={16} />
            Limpar
          </button>
        </div>
      </form>

      {/* Tabela */}
      <div className="tabela-card">
        {loading ? (
          <div className="auditoria-loading">Carregando logs...</div>
        ) : logs.length === 0 ? (
          <div className="no-data">Nenhum log encontrado com os filtros selecionados.</div>
        ) : (
          <>
            <table className="auditoria-tabela">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th>Entidade</th>
                  <th>IP</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="col-data">{formatDate(log.createdAt)}</td>
                    <td className="col-user">
                      <div className="user-cell">
                        <span className="user-email">{log.userEmail || 'Sistema'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`action-badge ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="col-entity">
                      <span className="entity-badge">{log.entity}</span>
                      {log.entityId && (
                        <span className="entity-id" title={log.entityId}>
                          #{log.entityId.substring(0, 8)}
                        </span>
                      )}
                    </td>
                    <td className="col-ip">{log.ipAddress || '-'}</td>
                    <td>
                      <button
                        className="btn-detalhes"
                        onClick={() => setLogSelecionado(log)}
                        disabled={!log.oldValues && !log.newValues}
                      >
                        Ver diff
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Paginação */}
            <div className="paginacao">
              <span className="paginacao-info">
                Página {pagination.page} de {pagination.totalPages || 1} • {pagination.total} registros
              </span>
              <div className="paginacao-controls">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="btn-page"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="btn-page"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de Diff */}
      {logSelecionado && (
        <div className="modal-overlay" onClick={() => setLogSelecionado(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalhes da Alteração</h2>
              <button className="modal-close" onClick={() => setLogSelecionado(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="diff-info">
                <p>
                  <strong>Ação:</strong>{' '}
                  <span className={`action-badge ${getActionBadge(logSelecionado.action)}`}>
                    {logSelecionado.action}
                  </span>
                </p>
                <p>
                  <strong>Entidade:</strong> {logSelecionado.entity}
                  {logSelecionado.entityId && ` (#${logSelecionado.entityId.substring(0, 8)})`}
                </p>
                <p>
                  <strong>Usuário:</strong> {logSelecionado.userEmail || 'Sistema'}
                </p>
                <p>
                  <strong>Data:</strong> {formatDate(logSelecionado.createdAt)}
                </p>
                {logSelecionado.ipAddress && (
                  <p>
                    <strong>IP:</strong> {logSelecionado.ipAddress}
                  </p>
                )}
              </div>

              <div className="diff-section">
                <h3>Comparação de Dados</h3>
                {logSelecionado.action === 'DELETE' && (
                  <p className="diff-context-msg">📌 Registro excluído — dados anteriores:</p>
                )}
                {logSelecionado.action === 'CREATE' && (
                  <p className="diff-context-msg">📌 Novo registro criado — dados inseridos:</p>
                )}
                <DiffViewer
                  oldValues={logSelecionado.oldValues}
                  newValues={logSelecionado.newValues}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Retenção */}
      {showRetentionModal && (
        <div className="modal-overlay" onClick={() => setShowRetentionModal(false)}>
          <div className="modal-content modal-retention" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Retenção de Logs</h2>
              <button className="modal-close" onClick={() => setShowRetentionModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="retention-warning">
                <AlertTriangle size={32} />
                <p>
                  Esta operação irá <strong>remover permanentemente</strong> todos os logs
                  de auditoria com mais de {retentionDays} dias.
                </p>
                <p className="retention-note">
                  Recomendamos exportar ou arquivar os logs antes de removê-los.
                </p>
              </div>
              <div className="retention-input">
                <label>Período de retenção (dias):</label>
                <input
                  type="number"
                  min="30"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(parseInt(e.target.value) || 365)}
                />
                <small>Mínimo: 30 dias</small>
              </div>
              <div className="retention-actions">
                <button
                  className="btn-cancel"
                  onClick={() => setShowRetentionModal(false)}
                  disabled={purging}
                >
                  Cancelar
                </button>
                <button
                  className="btn-confirm-purge"
                  onClick={handlePurge}
                  disabled={purging}
                >
                  {purging ? 'Removendo...' : 'Confirmar Remoção'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};