const prisma = require('../config/prisma');

class ProductService {
  async listar(tenantId, filtros = {}) {
    const { page = 1, limit = 20, categoria, search = '' } = filtros;
    const offset = (page - 1) * limit;

    const where = { tenantId };
    if (categoria) where.category = categoria;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where })
    ]);

    return {
      produtos: products.map(p => ({
        id: p.id,
        nome: p.name,
        descricao: p.description,
        preco: p.price,
        estoque: p.stock,
        categoria: p.category,
        imagem_url: p.imageUrl,
        ativo: p.active,
        data_criacao: p.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async buscarPorId(id, tenantId) {
    const product = await prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { orderItems: true } }
      }
    });

    if (!product) return null;

    return {
      id: product.id,
      nome: product.name,
      descricao: product.description,
      preco: product.price,
      estoque: product.stock,
      categoria: product.category,
      imagem_url: product.imageUrl,
      ativo: product.active,
      data_criacao: product.createdAt,
      total_vendas: product._count.orderItems,
    };
  }

  async criar(tenantId, data) {
    const { nome, descricao, preco, estoque = 0, categoria, imagem_url } = data;

    return prisma.product.create({
      data: {
        tenantId,
        name: nome,
        description: descricao || null,
        price: preco,
        stock: estoque,
        category: categoria || null,
        imageUrl: imagem_url || null,
      }
    });
  }

  async atualizar(id, tenantId, data) {
    const product = await prisma.product.findFirst({
      where: { id, tenantId }
    });

    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    const updateData = {};
    if (data.nome) updateData.name = data.nome;
    if (data.descricao !== undefined) updateData.description = data.descricao;
    if (data.preco !== undefined) updateData.price = data.preco;
    if (data.estoque !== undefined) updateData.stock = data.estoque;
    if (data.categoria !== undefined) updateData.category = data.categoria;
    if (data.imagem_url !== undefined) updateData.imageUrl = data.imagem_url;
    if (data.ativo !== undefined) updateData.active = data.ativo;

    return prisma.product.update({
      where: { id },
      data: updateData
    });
  }

  async deletar(id, tenantId) {
    const product = await prisma.product.findFirst({
      where: { id, tenantId }
    });

    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    return prisma.product.delete({
      where: { id }
    });
  }

  async getTopProdutos(tenantId, limit = 5) {
    // Buscar produtos com contagem de itens de pedido
    const products = await prisma.product.findMany({
      where: { tenantId },
      include: {
        _count: { select: { orderItems: true } }
      },
      take: 100 // Buscar mais para ordenar em memória
    });

    // Ordenar por total de vendas (descendente) em memória
    return products
      .sort((a, b) => b._count.orderItems - a._count.orderItems)
      .slice(0, limit)
      .map(p => ({
        nome: p.name,
        total_vendas: p._count.orderItems,
      }));
  }
}

module.exports = new ProductService();