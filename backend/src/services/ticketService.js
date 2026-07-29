const prisma = require('../config/prisma');

class TicketService {
  async listar(tenantId, filtros = {}) {
    const { page = 1, limit = 20, status, prioridade, categoria, search = '' } = filtros;
    const offset = (page - 1) * limit;

    const where = { tenantId };
    
    if (status) where.status = status;
    if (prioridade) where.priority = prioridade;
    if (categoria) where.category = categoria;
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: [
          { priority: 'asc' },
          { openedAt: 'desc' }
        ],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      }),
      prisma.ticket.count({ where })
    ]);

    return {
      chamados: tickets.map(t => ({
        id: t.id,
        titulo: t.title,
        descricao: t.description,
        categoria: t.category,
        prioridade: t.priority,
        status: t.status,
        data_abertura: t.openedAt,
        data_fechamento: t.closedAt,
        data_atualizacao: t.updatedAt,
        usuario_nome: t.user.name,
        usuario_email: t.user.email,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async buscarPorId(id, tenantId) {
    const ticket = await prisma.ticket.findFirst({
      where: { id, tenantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    if (!ticket) return null;

    return {
      id: ticket.id,
      titulo: ticket.title,
      descricao: ticket.description,
      categoria: ticket.category,
      prioridade: ticket.priority,
      status: ticket.status,
      data_abertura: ticket.openedAt,
      data_fechamento: ticket.closedAt,
      data_atualizacao: ticket.updatedAt,
      usuario_nome: ticket.user.name,
      usuario_email: ticket.user.email,
    };
  }

  async criar(tenantId, userId, data) {
    const { titulo, descricao, categoria, prioridade = 'medium' } = data;

    const ticket = await prisma.ticket.create({
      data: {
        tenantId,
        userId,
        title: titulo,
        description: descricao || null,
        category: categoria || null,
        priority: prioridade,
      }
    });

    return ticket;
  }

  async atualizar(id, tenantId, data) {
    const ticket = await prisma.ticket.findFirst({
      where: { id, tenantId }
    });

    if (!ticket) {
      throw new Error('TICKET_NOT_FOUND');
    }

    const updateData = {};
    if (data.titulo) updateData.title = data.titulo;
    if (data.descricao !== undefined) updateData.description = data.descricao;
    if (data.categoria !== undefined) updateData.category = data.categoria;
    if (data.prioridade) updateData.priority = data.prioridade;
    if (data.status) {
      updateData.status = data.status;
      if (data.status === 'closed' || data.status === 'resolved') {
        updateData.closedAt = new Date();
      }
    }

    return prisma.ticket.update({
      where: { id },
      data: updateData
    });
  }

  async deletar(id, tenantId) {
    const ticket = await prisma.ticket.findFirst({
      where: { id, tenantId }
    });

    if (!ticket) {
      throw new Error('TICKET_NOT_FOUND');
    }

    return prisma.ticket.delete({
      where: { id }
    });
  }

  async getStats(tenantId, periodo = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodo);

    const tickets = await prisma.ticket.groupBy({
      by: ['status'],
      where: {
        tenantId,
        openedAt: { gte: startDate }
      },
      _count: { id: true }
    });

    return tickets.map(t => ({
      status: t.status,
      total: t._count.id
    }));
  }
}

module.exports = new TicketService();