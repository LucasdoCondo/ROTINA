const bcrypt = require('bcryptjs');
const userService = require('../services/userService');
const { logCreate, logUpdate, logDelete, logExport } = require('../utils/auditLogger');

// Listar todos os usuários do tenant
const listarUsuarios = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { page, limit, search } = req.query;

    const result = await userService.listar(tenantId, { page, limit, search });

    res.json(result);

  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({
      message: 'Erro ao listar usuários',
      error: error.message,
    });
  }
};

// Obter usuário por ID
const getUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const usuario = await userService.buscarPorId(id, tenantId);

    if (!usuario) {
      return res.status(404).json({
        message: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({ usuario });

  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({
      message: 'Erro ao buscar usuário',
    });
  }
};

// Criar usuário (admin)
const criarUsuario = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { nome, email, senha, cargo, avatar_url } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({
        message: 'Nome, email e senha são obrigatórios',
        code: 'MISSING_FIELDS'
      });
    }

    const usuario = await userService.criar(tenantId, {
      nome, email, senha, cargo, avatar_url
    });

    // 📝 Audit Log: registrar criação
    // Nota: a senha é sanitizada automaticamente pelo auditLogger
    logCreate(tenantId, req.user, 'User', usuario, req);

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      usuario,
    });

  } catch (error) {
    if (error.message === 'EMAIL_EXISTS') {
      return res.status(409).json({
        message: 'Email já cadastrado',
        code: 'EMAIL_EXISTS'
      });
    }

    console.error('Erro ao criar usuário:', error);
    res.status(500).json({
      message: 'Erro ao criar usuário',
    });
  }
};

// Atualizar usuário
const atualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const { nome, email, cargo, ativo } = req.body;

    // 📝 Buscar dados ANTES da alteração (para audit log)
    const usuarioAntigo = await userService.buscarPorId(id, tenantId);

    const usuario = await userService.atualizar(id, tenantId, {
      nome, email, cargo, ativo
    });

    // 📝 Audit Log: registrar atualização com oldValues e newValues
    logUpdate(tenantId, req.user, 'User', id, usuarioAntigo, usuario, req);

    res.json({
      message: 'Usuário atualizado com sucesso',
      usuario,
    });

  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({
        message: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({
      message: 'Erro ao atualizar usuário',
    });
  }
};

// Deletar usuário (somente admin)
const deletarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    // Não permitir deletar a si mesmo
    if (id === req.user.id) {
      return res.status(400).json({
        message: 'Não é possível deletar seu próprio usuário',
        code: 'CANNOT_DELETE_SELF'
      });
    }

    // 📝 Buscar dados ANTES de excluir (para audit log)
    const usuarioExcluido = await userService.buscarPorId(id, tenantId);

    await userService.deletar(id, tenantId);

    // 📝 Audit Log: registrar exclusão com oldValues
    logDelete(tenantId, req.user, 'User', id, usuarioExcluido, req);

    res.json({
      message: 'Usuário deletado com sucesso',
    });

  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({
        message: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({
      message: 'Erro ao deletar usuário',
    });
  }
};

// Exportar dados do usuário (LGPD - Direito de portabilidade)
const exportarDadosUsuario = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const userId = req.user.id; // Usuário autenticado pode Exportar apenas seus próprios dados

    const dadosExportacao = await userService.exportarDados(tenantId, userId);

    // 📝 Audit Log: registrar exportação
    logExport(tenantId, req.user, 'User', userId, req);

    // Retornar como arquivo JSON para download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="dados-usuario-${userId}.json"`);
    res.json(dadosExportacao);

  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({
        message: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    console.error('Erro ao exportar dados:', error);
    res.status(500).json({
      message: 'Erro ao exportar dados',
      error: error.message,
    });
  }
};

module.exports = {
  listarUsuarios,
  getUsuario,
  criarUsuario,
  atualizarUsuario,
  deletarUsuario,
  exportarDadosUsuario,
};
