const prisma = require('../config/prisma');

class TenantService {
  async buscarPorId(id) {
    return prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            clients: true,
            tickets: true,
            orders: true,
          }
        },
        subscription: true,
        modules: {
          where: { active: true }
        }
      }
    });
  }

  async listar(filtros = {}) {
    const { page = 1, limit = 20, search = '' } = filtros;
    const offset = (page - 1) * limit;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { users: true }
          }
        }
      }),
      prisma.tenant.count({ where })
    ]);

    return {
      tenants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async criar(data) {
    return prisma.tenant.create({ data });
  }

  async atualizar(id, data) {
    return prisma.tenant.update({
      where: { id },
      data
    });
  }

  async desativar(id) {
    return prisma.tenant.update({
      where: { id },
      data: { active: false }
    });
  }

  async excluir(id) {
    // A exclusão em cascata será tratada pelo Prisma (onDelete: Cascade)
    return prisma.tenant.delete({
      where: { id }
    });
  }

  async getDashboardStats(tenantId) {
    const [
      ticketsAbertos,
      ticketsEmAndamento,
      clientesAtivos,
      pedidosMes,
      faturamentoMes,
      faturamentoAno,
      usuariosOnline
    ] = await Promise.all([
      prisma.ticket.count({
        where: { tenantId, status: 'open' }
      }),
      prisma.ticket.count({
        where: { tenantId, status: 'in_progress' }
      }),
      prisma.client.count({
        where: { tenantId, status: 'active' }
      }),
      prisma.order.count({
        where: {
          tenantId,
          orderDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      prisma.order.aggregate({
        where: {
          tenantId,
          orderDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _sum: { totalAmount: true }
      }),
      prisma.order.aggregate({
        where: {
          tenantId,
          orderDate: {
            gte: new Date(new Date().getFullYear(), 0, 1)
          }
        },
        _sum: { totalAmount: true }
      }),
      prisma.onlineSession.count({
        where: { tenantId }
      })
    ]);

    return {
      chamados_abertos: ticketsAbertos,
      chamados_em_andamento: ticketsEmAndamento,
      clientes_ativos: clientesAtivos,
      total_pedidos_mes: pedidosMes,
      faturamento_mes: faturamentoMes._sum.totalAmount || 0,
      faturamento_ano: faturamentoAno._sum.totalAmount || 0,
      usuarios_online: usuariosOnline,
    };
  }
}

module.exports = new TenantService();