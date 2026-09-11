const opportunityService = require('../services/opportunityService');
const { logCreate, logUpdate, logDelete } = require('../utils/auditLogger');

// Listar oportunidades
const listarOportunidades = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { page, limit, stage, clientId, search } = req.query;

    const result = await opportunityService.listar(tenantId, { page, limit, stage, clientId, search });

    res.json(result);

  } catch (error) {
    if (error.message === 'INVALID_STAGE') {
      return res.status(400).json({
        message: 'Estagio invalido',
        code: 'INVALID_STAGE'
      });
    }
    console.error('Erro ao listar oportunidades:', error);
    res.status(500).json({
      message: 'Erro ao listar oportunidades',
      error: error.message,
    });
  }
};

// Obter oportunidade por ID
const getOportunidade = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const oportunidade = await opportunityService.buscarPorId(id, tenantId);

    if (!oportunidade) {
      return res.status(404).json({
        message: 'Oportunidade nao encontrada',
        code: 'OPPORTUNITY_NOT_FOUND'
      });
    }

    res.json({ oportunidade });

  } catch (error) {
    console.error('Erro ao buscar oportunidade:', error);
    res.status(500).json({
      message: 'Erro ao buscar oportunidade',
    });
  }
};

// Criar oportunidade
const criarOportunidade = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { titulo, descricao, cliente_id, valor, estagio, probabilidade, data_fechamento_prevista, responsavel_id } = req.body;
    const usuarioId = req.user.id;

    if (!titulo) {
      return res.status(400).json({
        message: 'Titulo e obrigatorio',
        code: 'MISSING_FIELDS'
      });
    }

    const oportunidade = await opportunityService.criar(tenantId, usuarioId, {
      titulo, descricao, cliente_id, valor, estagio, probabilidade, data_fechamento_prevista, responsavel_id
    });

    // Audit Log: registrar criacao
    logCreate(tenantId, req.user, 'Opportunity', oportunidade, req);

    res.status(201).json({
      message: 'Oportunidade criada com sucesso',
      oportunidade,
    });

  } catch (error) {
    if (error.message === 'MISSING_TITLE') {
      return res.status(400).json({
        message: 'Titulo e obrigatorio',
        code: 'MISSING_FIELDS'
      });
    }
    if (error.message === 'INVALID_STAGE') {
      return res.status(400).json({
        message: 'Estagio invalido',
        code: 'INVALID_STAGE'
      });
    }
    if (error.message === 'CLIENT_NOT_FOUND') {
      return res.status(404).json({
        message: 'Cliente nao encontrado',
        code: 'CLIENT_NOT_FOUND'
      });
    }
    console.error('Erro ao criar oportunidade:', error);
    res.status(500).json({
      message: 'Erro ao criar oportunidade',
    });
  }
};

// Atualizar oportunidade
const atualizarOportunidade = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const { titulo, descricao, cliente_id, valor, estagio, probabilidade, data_fechamento_prevista, responsavel_id } = req.body;

    // Buscar dados ANTES da alteracao (para audit log)
    const oportunidadeAntiga = await opportunityService.buscarPorId(id, tenantId);

    const oportunidade = await opportunityService.atualizar(id, tenantId, {
      titulo, descricao, cliente_id, valor, estagio, probabilidade, data_fechamento_prevista, responsavel_id
    });

    // Audit Log: registrar atualizacao com oldValues e newValues
    logUpdate(tenantId, req.user, 'Opportunity', id, oportunidadeAntiga, oportunidade, req);

    res.json({
      message: 'Oportunidade atualizada com sucesso',
      oportunidade,
    });

  } catch (error) {
    if (error.message === 'OPPORTUNITY_NOT_FOUND') {
      return res.status(404).json({
        message: 'Oportunidade nao encontrada',
        code: 'OPPORTUNITY_NOT_FOUND'
      });
    }
    if (error.message === 'INVALID_STAGE') {
      return res.status(400).json({
        message: 'Estagio invalido',
        code: 'INVALID_STAGE'
      });
    }
    if (error.message === 'CLIENT_NOT_FOUND') {
      return res.status(404).json({
        message: 'Cliente nao encontrado',
        code: 'CLIENT_NOT_FOUND'
      });
    }
    console.error('Erro ao atualizar oportunidade:', error);
    res.status(500).json({
      message: 'Erro ao atualizar oportunidade',
    });
  }
};

// Deletar oportunidade
const deletarOportunidade = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    // Buscar dados ANTES de excluir (para audit log)
    const oportunidadeExcluida = await opportunityService.buscarPorId(id, tenantId);

    await opportunityService.deletar(id, tenantId);

    // Audit Log: registrar exclusao com oldValues
    logDelete(tenantId, req.user, 'Opportunity', id, oportunidadeExcluida, req);

    res.json({
      message: 'Oportunidade deletada com sucesso',
    });

  } catch (error) {
    if (error.message === 'OPPORTUNITY_NOT_FOUND') {
      return res.status(404).json({
        message: 'Oportunidade nao encontrada',
        code: 'OPPORTUNITY_NOT_FOUND'
      });
    }
    console.error('Erro ao deletar oportunidade:', error);
    res.status(500).json({
      message: 'Erro ao deletar oportunidade',
    });
  }
};

module.exports = {
  listarOportunidades,
  getOportunidade,
  criarOportunidade,
  atualizarOportunidade,
  deletarOportunidade,
};
