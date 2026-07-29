import { useState, useEffect } from 'react';
import { dashboardService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Ticket,
  UserCheck,
  ShoppingCart,
  TrendingUp,
  Clock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Download } from 'lucide-react';
import './Dashboard.css';

export const Dashboard = () => {
  const [dados, setDados] = useState(null);
  const [graficos, setGraficos] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [dadosRes, graficosRes] = await Promise.all([
        dashboardService.getDados(),
        dashboardService.getGraficos(),
      ]);
      setDados(dadosRes.data);
      setGraficos(graficosRes.data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Carregando...</div>;
  }

  const statsCards = [
    {
      title: 'Chamados Abertos',
      value: dados?.estatisticas?.chamados_abertos || 0,
      icon: Ticket,
      color: '#f44336',
    },
    {
      title: 'Clientes Ativos',
      value: dados?.estatisticas?.clientes_ativos || 0,
      icon: UserCheck,
      color: '#4caf50',
    },
    {
      title: 'Pedidos do Mês',
      value: dados?.estatisticas?.total_pedidos_mes || 0,
      icon: ShoppingCart,
      color: '#ff9800',
    },
    {
      title: 'Faturamento Mensal',
      value: `R$ ${(dados?.estatisticas?.faturamento_mes || 0).toFixed(2)}`,
      icon: TrendingUp,
      color: '#2196f3',
    },
  ];

  const exportarMeusDados = async () => {
    try {
      const response = await fetch('/api/user/export', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const userId = user?.id || 'usuario';
        link.download = `dados-usuario-${userId}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        alert('Seus dados foram exportados com sucesso!');
      } else {
        const data = await response.json();
        alert(`Erro ao exportar: ${data.message || 'Falha na exportação'}`);
      }
    } catch (error) {
      console.error('Erro na exportação:', error);
      alert('Erro ao exportar dados. Tente novamente.');
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header" id="step-dashboard">
        <div>
          <h1>Dashboard</h1>
          <p className="dashboard-subtitle">Visão geral do sistema</p>
        </div>
        <div className="header-actions">
          <button
            id="step-settings"
            className="settings-btn"
            onClick={() => navigate('/configuracoes')}
            title="Configurações"
          >
            ⚙️ Configurações
          </button>
          <button
            id="step-new-item"
            className="new-item-btn"
            onClick={() => navigate('/chamados/novo')}
            title="Novo Chamado"
          >
            + Novo Chamado
          </button>
          <button className="export-btn" onClick={exportarMeusDados} title="Exportar meus dados (LGPD)">
            <Download size={18} />
            Exportar Meus Dados
          </button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="stats-grid">
        {statsCards.map((stat, index) => (
          <div key={index} className="stat-card" style={{ borderTop: `4px solid ${stat.color}` }}>
            <div className="stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
              <stat.icon size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-title">{stat.title}</p>
              <p className="stat-value">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos e Informações */}
      <div className="dashboard-grid">
        {/* Gráfico de Vendas */}
        <div className="card chart-card">
          <h3>Vendas dos Últimos 7 Dias</h3>
          {graficos?.vendas_por_dia && graficos.vendas_por_dia.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={graficos.vendas_por_dia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip
                  formatter={(value) => `R$ ${value.toFixed(2)}`}
                  labelStyle={{ color: '#333' }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#1976d2"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">Nenhum dado disponível</p>
          )}
        </div>

        {/* Chamados Recentes */}
        <div className="card">
          <h3>Chamados Recentes</h3>
          {dados?.chamados_recentes && dados.chamados_recentes.length > 0 ? (
            <div className="recent-list">
              {dados.chamados_recentes.map((chamado) => (
                <div key={chamado.id} className="recent-item">
                  <div className="recent-item-header">
                    <span className="recent-item-title">{chamado.titulo}</span>
                    <span className={`priority-badge ${chamado.prioridade}`}>
                      {chamado.prioridade}
                    </span>
                  </div>
                  <div className="recent-item-meta">
                    <Clock size={14} />
                    <span>{new Date(chamado.data_abertura).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">Nenhum chamado recente</p>
          )}
        </div>

        {/* Pedidos Recentes */}
        <div className="card">
          <h3>Pedidos Recentes</h3>
          {dados?.pedidos_recentes && dados.pedidos_recentes.length > 0 ? (
            <div className="recent-list">
              {dados.pedidos_recentes.map((pedido) => (
                <div key={pedido.id} className="recent-item">
                  <div className="recent-item-header">
                    <span className="recent-item-title">
                      {pedido.cliente_nome || 'Cliente não identificado'}
                    </span>
                    <span className="order-value">R$ {pedido.valor_total.toFixed(2)}</span>
                  </div>
                  <div className="recent-item-meta">
                    <ShoppingCart size={14} />
                    <span>{new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}</span>
                    <span className={`status-badge ${pedido.status}`}>{pedido.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">Nenhum pedido recente</p>
          )}
        </div>

        {/* Usuários Online */}
        <div className="card">
          <h3>Usuários Online</h3>
          <div className="online-stat">
            <Users size={48} color="#4caf50" />
            <div>
              <p className="online-count">{dados?.usuarios_online?.total || 0}</p>
              <p className="online-label">usuários ativos agora</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};