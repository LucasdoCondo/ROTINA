const productService = require('../services/productService');
const { logCreate, logUpdate, logDelete } = require('../utils/auditLogger');

// Listar produtos
const listarProdutos = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { page, limit, categoria, search } = req.query;

    const result = await productService.listar(tenantId, { page, limit, categoria, search });

    res.json(result);

  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({
      message: 'Erro ao listar produtos',
      error: error.message,
    });
  }
};

// Obter produto por ID
const getProduto = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const produto = await productService.buscarPorId(id, tenantId);

    if (!produto) {
      return res.status(404).json({
        message: 'Produto não encontrado',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    res.json({ produto });

  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    res.status(500).json({
      message: 'Erro ao buscar produto',
    });
  }
};

// Criar produto
const criarProduto = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { nome, descricao, preco, estoque, categoria, imagem_url } = req.body;

    if (!nome || !preco) {
      return res.status(400).json({
        message: 'Nome e preço são obrigatórios',
        code: 'MISSING_FIELDS'
      });
    }

    const produto = await productService.criar(tenantId, {
      nome, descricao, preco, estoque, categoria, imagem_url
    });

    // 📝 Audit Log: registrar criação
    logCreate(tenantId, req.user, 'Product', produto, req);

    res.status(201).json({
      message: 'Produto criado com sucesso',
      produto,
    });

  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({
      message: 'Erro ao criar produto',
    });
  }
};

// Atualizar produto
const atualizarProduto = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const { nome, descricao, preco, estoque, categoria, imagem_url, ativo } = req.body;

    // 📝 Buscar dados ANTES da alteração (para audit log)
    const produtoAntigo = await productService.buscarPorId(id, tenantId);

    const produto = await productService.atualizar(id, tenantId, {
      nome, descricao, preco, estoque, categoria, imagem_url, ativo
    });

    // 📝 Audit Log: registrar atualização com oldValues e newValues
    logUpdate(tenantId, req.user, 'Product', id, produtoAntigo, produto, req);

    res.json({
      message: 'Produto atualizado com sucesso',
      produto,
    });

  } catch (error) {
    if (error.message === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({
        message: 'Produto não encontrado',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({
      message: 'Erro ao atualizar produto',
    });
  }
};

// Deletar produto
const deletarProduto = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    // 📝 Buscar dados ANTES de excluir (para audit log)
    const produtoExcluido = await productService.buscarPorId(id, tenantId);

    await productService.deletar(id, tenantId);

    // 📝 Audit Log: registrar exclusão com oldValues
    logDelete(tenantId, req.user, 'Product', id, produtoExcluido, req);

    res.json({
      message: 'Produto deletado com sucesso',
    });

  } catch (error) {
    if (error.message === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({
        message: 'Produto não encontrado',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    console.error('Erro ao deletar produto:', error);
    res.status(500).json({
      message: 'Erro ao deletar produto',
    });
  }
};

module.exports = {
  listarProdutos,
  getProduto,
  criarProduto,
  atualizarProduto,
  deletarProduto,
};