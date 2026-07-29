const memberService = require('../services/memberService');
const { logCreate, logUpdate, logDelete } = require('../utils/auditLogger');

// Listar membros/assinaturas
const listarMembros = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { page, limit, status, search } = req.query;

    const result = await memberService.listar(tenantId, { page, limit, status, search });

    res.json(result);

  } catch (error) {
    console.error('Erro ao listar membros:', error);
    res.status(500).json({
      message: 'Erro ao listar membros',
      error: error.message,
    });
  }
};

// Obter membro por ID
const getMembro = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const membro = await memberService.buscarPorId(id, tenantId);

    if (!membro) {
      return res.status(404).json({
        message: 'Membro não encontrado',
        code: 'MEMBER_NOT_FOUND'
      });
    }

    res.json({ membro });

  } catch (error) {
    console.error('Erro ao buscar membro:', error);
    res.status(500).json({
      message: 'Erro ao buscar membro',
    });
  }
};

// Criar membro/assinatura
const criarMembro = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { usuario_id, tipo_plano, data_inicio, data_fim, valor_mensal } = req.body;

    if (!usuario_id || !tipo_plano || !data_inicio) {
      return res.status(400).json({
        message: 'Usuário, tipo de plano e data de início são obrigatórios',
        code: 'MISSING_FIELDS'
      });
    }

    const membro = await memberService.criar(tenantId, {
      usuario_id, tipo_plano, data_inicio, data_fim, valor_mensal
    });

    // 📝 Audit Log: registrar criação
    logCreate(tenantId, req.user, 'MemberSubscription', membro, req);

    res.status(201).json({
      message: 'Membro cadastrado com sucesso',
      membro,
    });

  } catch (error) {
    console.error('Erro ao criar membro:', error);
    res.status(500).json({
      message: 'Erro ao criar membro',
    });
  }
};

// Atualizar membro
const atualizarMembro = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const { tipo_plano, data_inicio, data_fim, valor_mensal, status } = req.body;

    // 📝 Buscar dados ANTES da alteração (para audit log)
    const membroAntigo = await memberService.buscarPorId(id, tenantId);

    const membro = await memberService.atualizar(id, tenantId, {
      tipo_plano, data_inicio, data_fim, valor_mensal, status
    });

    // 📝 Audit Log: registrar atualização com oldValues e newValues
    logUpdate(tenantId, req.user, 'MemberSubscription', id, membroAntigo, membro, req);

    res.json({
      message: 'Membro atualizado com sucesso',
      membro,
    });

  } catch (error) {
    if (error.message === 'MEMBER_NOT_FOUND') {
      return res.status(404).json({
        message: 'Membro não encontrado',
        code: 'MEMBER_NOT_FOUND'
      });
    }

    console.error('Erro ao atualizar membro:', error);
    res.status(500).json({
      message: 'Erro ao atualizar membro',
    });
  }
};

// Deletar membro
const deletarMembro = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    // 📝 Buscar dados ANTES de excluir (para audit log)
    const membroExcluido = await memberService.buscarPorId(id, tenantId);

    await memberService.deletar(id, tenantId);

    // 📝 Audit Log: registrar exclusão com oldValues
    logDelete(tenantId, req.user, 'MemberSubscription', id, membroExcluido, req);

    res.json({
      message: 'Membro deletado com sucesso',
    });

  } catch (error) {
    if (error.message === 'MEMBER_NOT_FOUND') {
      return res.status(404).json({
        message: 'Membro não encontrado',
        code: 'MEMBER_NOT_FOUND'
      });
    }

    console.error('Erro ao deletar membro:', error);
    res.status(500).json({
      message: 'Erro ao deletar membro',
    });
  }
};

module.exports = {
  listarMembros,
  getMembro,
  criarMembro,
  atualizarMembro,
  deletarMembro,
};