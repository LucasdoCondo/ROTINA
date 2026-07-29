const orderService = require('../services/orderService');
const { logCreate, logUpdate, logDelete } = require('../utils/auditLogger');

// Listar pedidos
const listarPedidos = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { page, limit, status, search } = req.query;

    const result = await orderService.listar(tenantId, { page, limit, status, search });

    res.json(result);

  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    res.status(500).json({
      message: 'Erro ao listar pedidos',
      error: error.message,
    });
  }
};

// Obter pedido por ID
const getPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const pedido = await orderService.buscarPorId(id, tenantId);

    if (!pedido) {
      return res.status(404).json({
        message: 'Pedido não encontrado',
        code: 'ORDER_NOT_FOUND'
      });
    }

    res.json({ pedido });

  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    res.status(500).json({
      message: 'Erro ao buscar pedido',
    });
  }
};

// Criar pedido
const criarPedido = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { cliente_id, itens } = req.body;

    if (!cliente_id || !itens || itens.length === 0) {
      return res.status(400).json({
        message: 'Cliente e itens são obrigatórios',
        code: 'MISSING_FIELDS'
      });
    }

    const pedido = await orderService.criar(tenantId, { cliente_id, itens });

    // 📝 Audit Log: registrar criação
    logCreate(tenantId, req.user, 'Order', pedido, req);

    res.status(201).json({
      message: 'Pedido criado com sucesso',
      pedido,
    });

  } catch (error) {
    if (error.message?.startsWith('PRODUCT_NOT_FOUND')) {
      return res.status(404).json({
        message: 'Produto não encontrado',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    if (error.message?.startsWith('INSUFFICIENT_STOCK')) {
      return res.status(400).json({
        message: `Estoque insuficiente para: ${error.message.split(': ')[1]}`,
        code: 'INSUFFICIENT_STOCK'
      });
    }

    console.error('Erro ao criar pedido:', error);
    res.status(500).json({
      message: 'Erro ao criar pedido',
    });
  }
};

// Atualizar status do pedido
const atualizarStatusPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        message: 'Status é obrigatório',
        code: 'MISSING_FIELDS'
      });
    }

    // 📝 Buscar dados ANTES da alteração (para audit log)
    const pedidoAntigo = await orderService.buscarPorId(id, tenantId);

    const pedido = await orderService.atualizarStatus(id, tenantId, status);

    // 📝 Audit Log: registrar atualização de status
    logUpdate(
      tenantId,
      req.user,
      'Order',
      id,
      { status: pedidoAntigo?.status },
      { status: pedido.status },
      req
    );

    res.json({
      message: 'Status do pedido atualizado com sucesso',
      pedido,
    });

  } catch (error) {
    if (error.message === 'ORDER_NOT_FOUND') {
      return res.status(404).json({
        message: 'Pedido não encontrado',
        code: 'ORDER_NOT_FOUND'
      });
    }

    console.error('Erro ao atualizar pedido:', error);
    res.status(500).json({
      message: 'Erro ao atualizar pedido',
    });
  }
};

// Deletar pedido
const deletarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    // 📝 Buscar dados ANTES de excluir (para audit log)
    const pedidoExcluido = await orderService.buscarPorId(id, tenantId);

    await orderService.deletar(id, tenantId);

    // 📝 Audit Log: registrar exclusão com oldValues
    logDelete(tenantId, req.user, 'Order', id, pedidoExcluido, req);

    res.json({
      message: 'Pedido deletado com sucesso',
    });

  } catch (error) {
    if (error.message === 'ORDER_NOT_FOUND') {
      return res.status(404).json({
        message: 'Pedido não encontrado',
        code: 'ORDER_NOT_FOUND'
      });
    }

    console.error('Erro ao deletar pedido:', error);
    res.status(500).json({
      message: 'Erro ao deletar pedido',
    });
  }
};

module.exports = {
  listarPedidos,
  getPedido,
  criarPedido,
  atualizarStatusPedido,
  deletarPedido,
};