const prisma = require('../config/prisma');

class MemberService {
  async listar(tenantId, filtros = {}) {
    const { page = 1, limit = 20, status, search = '' } = filtros;
    const offset = (page - 1) * limit;

    const where = { tenantId };
    if (status) where.status = status;

    const [members, total] = await Promise.all([
      prisma.memberSubscription.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      prisma.memberSubscription.count({ where })
    ]);

    return {
      membros: members.map(m => ({
        id: m.id,
        usuario_id: m.userId,
        usuario_nome: m.user.name,
        usuario_email: m.user.email,
        tipo_plano: m.planType,
        data_inicio: m.startDate,
        data_fim: m.endDate,
        valor_mensal: m.monthlyValue,
        status: m.status,
        data_criacao: m.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async buscarPorId(id, tenantId) {
    const member = await prisma.memberSubscription.findFirst({
      where: { id, tenantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      }
    });

    if (!member) return null;

    return {
      id: member.id,
      usuario: member.user,
      tipo_plano: member.planType,
      data_inicio: member.startDate,
      data_fim: member.endDate,
      valor_mensal: member.monthlyValue,
      status: member.status,
      data_criacao: member.createdAt,
    };
  }

  async criar(tenantId, data) {
    const { usuario_id, tipo_plano, data_inicio, data_fim, valor_mensal } = data;

    return prisma.memberSubscription.create({
      data: {
        tenantId,
        userId: usuario_id,
        planType: tipo_plano,
        startDate: new Date(data_inicio),
        endDate: data_fim ? new Date(data_fim) : null,
        monthlyValue: valor_mensal || null,
        status: 'active',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });
  }

  async atualizar(id, tenantId, data) {
    const member = await prisma.memberSubscription.findFirst({
      where: { id, tenantId }
    });

    if (!member) {
      throw new Error('MEMBER_NOT_FOUND');
    }

    const updateData = {};
    if (data.tipo_plano) updateData.planType = data.tipo_plano;
    if (data.data_inicio) updateData.startDate = new Date(data.data_inicio);
    if (data.data_fim !== undefined) updateData.endDate = data.data_fim ? new Date(data.data_fim) : null;
    if (data.valor_mensal !== undefined) updateData.monthlyValue = data.valor_mensal;
    if (data.status) updateData.status = data.status;

    return prisma.memberSubscription.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });
  }

  async deletar(id, tenantId) {
    const member = await prisma.memberSubscription.findFirst({
      where: { id, tenantId }
    });

    if (!member) {
      throw new Error('MEMBER_NOT_FOUND');
    }

    return prisma.memberSubscription.delete({
      where: { id }
    });
  }
}

module.exports = new MemberService();