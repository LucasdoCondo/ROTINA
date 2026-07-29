const ticketService = require('../services/ticketService');
const { logCreate, logUpdate, logDelete } = require('../utils/auditLogger');

// Listar chamados
const listarChamados = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { page, limit, status, prioridade, categoria, search } = req.query;

    const result = await ticketService.listar(tenantId, {
      page, limit, status, prioridade, categoria, search
    });

    res.json(result);

  } catch (error) {
    console.error('Erro ao listar chamados:', error);
    res.status(500).json({
      message: 'Erro ao listar chamados',
      error: error.message,
    });
  }
};

// Obter chamado por ID
const getChamado = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const chamado = await ticketService.buscarPorId(id, tenantId);

    if (!chamado) {
      return res.status(404).json({
        message: 'Chamado não encontrado',
        code: 'TICKET_NOT_FOUND'
      });
    }

    res.json({ chamado });

  } catch (error) {
    console.error('Erro ao buscar chamado:', error);
    res.status(500).json({
      message: 'Erro ao buscar chamado',
    });
  }
};

// Criar chamado
const criarChamado = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { titulo, descricao, categoria, prioridade } = req.body;
    const usuarioId = req.user.id;

    if (!titulo) {
      return res.status(400).json({
        message: 'Título é obrigatório',
        code: 'MISSING_FIELDS'
      });
    }

    const chamado = await ticketService.criar(tenantId, usuarioId, {
      titulo, descricao, categoria, prioridade
    });

    // 📝 Audit Log: registrar criação
    logCreate(tenantId, req.user, 'Ticket', chamado, req);

    res.status(201).json({
      message: 'Chamado criado com sucesso',
      chamado,
    });

  } catch (error) {
    console.error('Erro ao criar chamado:', error);
    res.status(500).json({
      message: 'Erro ao criar chamado',
    });
  }
};

// Atualizar chamado
const atualizarChamado = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const { titulo, descricao, categoria, prioridade, status } = req.body;

    // 📝 Buscar dados ANTES da alteração (para audit log)
    const chamadoAntigo = await ticketService.buscarPorId(id, tenantId);

    const chamado = await ticketService.atualizar(id, tenantId, {
      titulo, descricao, categoria, prioridade, status
    });

    // 📝 Audit Log: registrar atualização com oldValues e newValues
    logUpdate(tenantId, req.user, 'Ticket', id, chamadoAntigo, chamado, req);

    res.json({
      message: 'Chamado atualizado com sucesso',
      chamado,
    });

  } catch (error) {
    if (error.message === 'TICKET_NOT_FOUND') {
      return res.status(404).json({
        message: 'Chamado não encontrado',
        code: 'TICKET_NOT_FOUND'
      });
    }

    console.error('Erro ao atualizar chamado:', error);
    res.status(500).json({
      message: 'Erro ao atualizar chamado',
    });
  }
};

// Deletar chamado
const deletarChamado = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    // 📝 Buscar dados ANTES de excluir (para audit log)
    const chamadoExcluido = await ticketService.buscarPorId(id, tenantId);

    await ticketService.deletar(id, tenantId);

    // 📝 Audit Log: registrar exclusão com oldValues
    logDelete(tenantId, req.user, 'Ticket', id, chamadoExcluido, req);

    res.json({
      message: 'Chamado deletado com sucesso',
    });

  } catch (error) {
    if (error.message === 'TICKET_NOT_FOUND') {
      return res.status(404).json({
        message: 'Chamado não encontrado',
        code: 'TICKET_NOT_FOUND'
      });
    }

    console.error('Erro ao deletar chamado:', error);
    res.status(500).json({
      message: 'Erro ao deletar chamado',
    });
  }
};

module.exports = {
  listarChamados,
  getChamado,
  criarChamado,
  atualizarChamado,
  deletarChamado,
};