const prisma = require('../config/prisma');

class ClientService {
  async listar(tenantId, filtros = {}) {
    const { page = 1, limit = 20, status, search = '' } = filtros;
    const offset = (page - 1) * limit;

    const where = { tenantId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { cpfCnpj: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { orders: true } }
        }
      }),
      prisma.client.count({ where })
    ]);

    return {
      clientes: clients.map(c => ({
        id: c.id,
        nome: c.name,
        cpf_cnpj: c.cpfCnpj,
        email: c.email,
        telefone: c.phone,
        endereco: c.address,
        status: c.status,
        origem: c.origin,
        data_primeira_compra: c.firstPurchaseDate,
        data_criacao: c.createdAt,
        total_pedidos: c._count.orders,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async buscarPorId(id, tenantId) {
    const client = await prisma.client.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { orders: true } },
        orders: {
          take: 5,
          orderBy: { orderDate: 'desc' },
          select: {
            id: true,
            totalAmount: true,
            status: true,
            orderDate: true,
          }
        }
      }
    });

    if (!client) return null;

    return {
      id: client.id,
      nome: client.name,
      cpf_cnpj: client.cpfCnpj,
      email: client.email,
      telefone: client.phone,
      endereco: client.address,
      status: client.status,
      origem: client.origin,
      data_primeira_compra: client.firstPurchaseDate,
      data_criacao: client.createdAt,
      total_pedidos: client._count.orders,
      ultimos_pedidos: client.orders,
    };
  }

  async criar(tenantId, data) {
    const { nome, cpf_cnpj, email, telefone, endereco, status, origem } = data;

    return prisma.client.create({
      data: {
        tenantId,
        name: nome,
        cpfCnpj: cpf_cnpj || null,
        email: email || null,
        phone: telefone || null,
        address: endereco || null,
        status: status || 'active',
        origin: origem || null,
      }
    });
  }

  async atualizar(id, tenantId, data) {
    const client = await prisma.client.findFirst({
      where: { id, tenantId }
    });

    if (!client) {
      throw new Error('CLIENT_NOT_FOUND');
    }

    const updateData = {};
    if (data.nome) updateData.name = data.nome;
    if (data.cpf_cnpj !== undefined) updateData.cpfCnpj = data.cpf_cnpj;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.telefone !== undefined) updateData.phone = data.telefone;
    if (data.endereco !== undefined) updateData.address = data.endereco;
    if (data.status) updateData.status = data.status;
    if (data.origem !== undefined) updateData.origin = data.origem;

    return prisma.client.update({
      where: { id },
      data: updateData
    });
  }

  async deletar(id, tenantId) {
    const client = await prisma.client.findFirst({
      where: { id, tenantId }
    });

    if (!client) {
      throw new Error('CLIENT_NOT_FOUND');
    }

    return prisma.client.delete({
      where: { id }
    });
  }

  async getNovosClientesPorMes(tenantId) {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const clients = await prisma.client.findMany({
      where: {
        tenantId,
        createdAt: { gte: oneYearAgo }
      },
      select: { createdAt: true }
    });

    // Agrupar por mês
    const porMes = {};
    clients.forEach(c => {
      const mes = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, '0')}`;
      porMes[mes] = (porMes[mes] || 0) + 1;
    });

    return Object.entries(porMes).map(([mes, total]) => ({ mes, total }));
  }
}

module.exports = new ClientService();