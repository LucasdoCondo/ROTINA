import axios from 'axios';

// Em produção (Vercel), usa URL relativa para evitar CORS
// Em desenvolvimento, usa a URL do backend local
const API_URL = import.meta.env.PROD 
  ? '/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

// Criar instância do axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação e assinatura
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    if (error.response?.status === 402) {
      // Assinatura vencida/cancelada - redireciona para upgrade
      const currentPath = window.location.pathname;
      const blockedPaths = ['/dashboard', '/crm', '/settings', '/usuarios', '/chamados', '/clientes', '/produtos', '/pedidos', '/membros'];
      
      // Só redireciona se não estiver já na página de upgrade
      if (!currentPath.startsWith('/billing/upgrade') && blockedPaths.some(p => currentPath.startsWith(p))) {
        const reason = (error.response?.data?.code || 'payment_required').toLowerCase();
        window.location.href = `/billing/upgrade?reason=${reason}`;
      }
    }
    
    return Promise.reject(error);
  }
);

// Serviços de Autenticação
export const authService = {
  registrar: (dados) => api.post('/auth/registrar', dados),
  login: (email, senha) => api.post('/auth/login', { email, senha }),
  logout: () => api.post('/auth/logout'),
  perfil: () => api.get('/auth/perfil'),
  atualizarPerfil: (dados) => api.put('/auth/perfil', dados),
};

// Serviços de Dashboard
export const dashboardService = {
  getDados: () => api.get('/dashboard'),
  getGraficos: (periodo = 30) => api.get(`/dashboard/graficos?periodo=${periodo}`),
  getAtividades: () => api.get('/dashboard/atividades'),
};

// Serviços de Usuários
export const usuariosService = {
  listar: (params = {}) => api.get('/usuarios', { params }),
  getById: (id) => api.get(`/usuarios/${id}`),
  criar: (dados) => api.post('/usuarios', dados),
  atualizar: (id, dados) => api.put(`/usuarios/${id}`, dados),
  deletar: (id) => api.delete(`/usuarios/${id}`),
};

// Serviços de Chamados
export const chamadosService = {
  listar: (params = {}) => api.get('/chamados', { params }),
  getById: (id) => api.get(`/chamados/${id}`),
  criar: (dados) => api.post('/chamados', dados),
  atualizar: (id, dados) => api.put(`/chamados/${id}`, dados),
  deletar: (id) => api.delete(`/chamados/${id}`),
};

// Serviços de Clientes (CRM)
export const clientesService = {
  listar: (params = {}) => api.get('/clientes', { params }),
  getById: (id) => api.get(`/clientes/${id}`),
  criar: (dados) => api.post('/clientes', dados),
  atualizar: (id, dados) => api.put(`/clientes/${id}`, dados),
  deletar: (id) => api.delete(`/clientes/${id}`),
};

// Serviços de Produtos
export const produtosService = {
  listar: (params = {}) => api.get('/produtos', { params }),
  getById: (id) => api.get(`/produtos/${id}`),
  criar: (dados) => api.post('/produtos', dados),
  atualizar: (id, dados) => api.put(`/produtos/${id}`, dados),
  deletar: (id) => api.delete(`/produtos/${id}`),
};

// Serviços de Pedidos
export const pedidosService = {
  listar: (params = {}) => api.get('/pedidos', { params }),
  getById: (id) => api.get(`/pedidos/${id}`),
  criar: (dados) => api.post('/pedidos', dados),
  atualizar: (id, dados) => api.put(`/pedidos/${id}`, dados),
  deletar: (id) => api.delete(`/pedidos/${id}`),
};

// Serviços de Membros
export const membrosService = {
  listar: (params = {}) => api.get('/membros', { params }),
  getById: (id) => api.get(`/membros/${id}`),
  criar: (dados) => api.post('/membros', dados),
  atualizar: (id, dados) => api.put(`/membros/${id}`, dados),
  deletar: (id) => api.delete(`/membros/${id}`),
};

// Serviços de Assinatura
export const assinaturaService = {
  listarPlanos: () => api.get('/assinatura/planos'),
  criarCheckout: (dados) => api.post('/assinatura/checkout', dados),
  minhaAssinatura: () => api.get('/assinatura/minha-assinatura'),
  historico: () => api.get('/assinatura/historico'),
  cancelar: () => api.post('/assinatura/cancelar'),
  status: () => api.get('/webhooks/status'),
};

// Serviços de Auditoria (Trilha de Auditoria)
export const auditoriaService = {
  listar: (params = {}) => api.get('/auditoria', { params }),
  getById: (id) => api.get(`/auditoria/${id}`),
  estatisticas: () => api.get('/auditoria/estatisticas'),
  purgeOldLogs: (retentionDays = 365) =>
    api.delete(`/auditoria/retention?retentionDays=${retentionDays}`),
};

export default api;
