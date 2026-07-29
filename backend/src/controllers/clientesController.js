const clientService = require('../services/clientService');
const { logCreate, logUpdate, logDelete, logExport } = require('../utils/auditLogger');

// Listar clientes
const listarClientes = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { page, limit, status, search } = req.query;

    const result = await clientService.listar(tenantId, { page, limit, status, search });

    res.json(result);

  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({
      message: 'Erro ao listar clientes',
      error: error.message,
    });
  }
};

// Obter cliente por ID
const getCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const cliente = await clientService.buscarPorId(id, tenantId);

    if (!cliente) {
      return res.status(404).json({
        message: 'Cliente não encontrado',
        code: 'CLIENT_NOT_FOUND'
      });
    }

    res.json({ cliente });

  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({
      message: 'Erro ao buscar cliente',
    });
  }
};

// Criar cliente
const criarCliente = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { nome, cpf_cnpj, email, telefone, endereco, status, origem } = req.body;

    if (!nome) {
      return res.status(400).json({
        message: 'Nome é obrigatório',
        code: 'MISSING_FIELDS'
      });
    }

    const cliente = await clientService.criar(tenantId, {
      nome, cpf_cnpj, email, telefone, endereco, status, origem
    });

    // 📝 Audit Log: registrar criação
    logCreate(tenantId, req.user, 'Client', cliente, req);

    res.status(201).json({
      message: 'Cliente criado com sucesso',
      cliente,
    });

  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({
      message: 'Erro ao criar cliente',
    });
  }
};

// Atualizar cliente
const atualizarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const { nome, cpf_cnpj, email, telefone, endereco, status, origem } = req.body;

    // 📝 Buscar dados ANTES da alteração (para audit log)
    const clienteAntigo = await clientService.buscarPorId(id, tenantId);

    const cliente = await clientService.atualizar(id, tenantId, {
      nome, cpf_cnpj, email, telefone, endereco, status, origem
    });

    // 📝 Audit Log: registrar atualização com oldValues e newValues
    logUpdate(tenantId, req.user, 'Client', id, clienteAntigo, cliente, req);

    res.json({
      message: 'Cliente atualizado com sucesso',
      cliente,
    });

  } catch (error) {
    if (error.message === 'CLIENT_NOT_FOUND') {
      return res.status(404).json({
        message: 'Cliente não encontrado',
        code: 'CLIENT_NOT_FOUND'
      });
    }

    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({
      message: 'Erro ao atualizar cliente',
    });
  }
};

// Deletar cliente
const deletarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    // 📝 Buscar dados ANTES de excluir (para audit log)
    const clienteExcluido = await clientService.buscarPorId(id, tenantId);

    await clientService.deletar(id, tenantId);

    // 📝 Audit Log: registrar exclusão com oldValues
    logDelete(tenantId, req.user, 'Client', id, clienteExcluido, req);

    res.json({
      message: 'Cliente deletado com sucesso',
    });

  } catch (error) {
    if (error.message === 'CLIENT_NOT_FOUND') {
      return res.status(404).json({
        message: 'Cliente não encontrado',
        code: 'CLIENT_NOT_FOUND'
      });
    }

    console.error('Erro ao deletar cliente:', error);
    res.status(500).json({
      message: 'Erro ao deletar cliente',
    });
  }
};

module.exports = {
  listarClientes,
  getCliente,
  criarCliente,
  atualizarCliente,
  deletarCliente,
};