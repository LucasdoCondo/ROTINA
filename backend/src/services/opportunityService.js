const prisma = require('../config/prisma');

// Estágios válidos do pipeline
const STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

class OpportunityService {
  async listar(tenantId, filtros = {}) {
    const { page = 1, limit = 20, stage, clientId, search = '' } = filtros;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const where = { tenantId };
    if (stage) {
      if (!STAGES.includes(stage)) {
        throw new Error('INVALID_STAGE');
      }
      where.stage = stage;
    }
    if (clientId) where.clientId = clientId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [opportunities, total] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        skip: offset,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.opportunity.count({ where }),
    ]);

    return {
      oportunidades: opportunities.map((o) => ({
        id: o.id,
        titulo: o.title,
        descricao: o.description,
        cliente_id: o.clientId,
        cliente_nome: o.client?.name || null,
        valor: o.value,
        estagio: o.stage,
        probabilidade: o.probability,
        data_fechamento_prevista: o.expectedCloseDate,
        data_fechamento: o.closedAt,
        responsavel_id: o.ownerUserId,
        data_criacao: o.createdAt,
      })),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async buscarPorId(id, tenantId) {
    const opp = await prisma.opportunity.findFirst({
      where: { id, tenantId },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    if (!opp) return null;

    return {
      id: opp.id,
      titulo: opp.title,
      descricao: opp.description,
      cliente: opp.client,
      valor: opp.value,
      estagio: opp.stage,
      probabilidade: opp.probability,
      data_fechamento_prevista: opp.expectedCloseDate,
      data_fechamento: opp.closedAt,
      responsavel_id: opp.ownerUserId,
      data_criacao: opp.createdAt,
    };
  }

  async criar(tenantId, userId, data) {
    const { titulo, descricao, cliente_id, valor = 0, estagio = 'lead', probabilidade = 0, data_fechamento_prevista, responsavel_id } = data;

    if (!titulo) {
      throw new Error('MISSING_TITLE');
    }

    if (estagio && !STAGES.includes(estagio)) {
      throw new Error('INVALID_STAGE');
    }

    // SEGURANCA (IDOR): o cliente informado DEVE pertencer ao mesmo tenant.
    if (cliente_id) {
      const client = await prisma.client.findFirst({
        where: { id: cliente_id, tenantId },
      });
      if (!client) {
        throw new Error('CLIENT_NOT_FOUND');
      }
    }

    return prisma.opportunity.create({
      data: {
        tenantId,
        clientId: cliente_id || null,
        title: titulo,
        description: descricao || null,
        value: valor,
        stage: estagio,
        probability: probabilidade,
        expectedCloseDate: data_fechamento_prevista ? new Date(data_fechamento_prevista) : null,
        ownerUserId: responsavel_id || userId || null,
      },
      include: {
        client: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async atualizar(id, tenantId, data) {
    const opp = await prisma.opportunity.findFirst({
      where: { id, tenantId },
    });

    if (!opp) {
      throw new Error('OPPORTUNITY_NOT_FOUND');
    }

    if (data.estagio && !STAGES.includes(data.estagio)) {
      throw new Error('INVALID_STAGE');
    }

    // SEGURANCA (IDOR): novo cliente tambem precisa ser do mesmo tenant.
    if (data.cliente_id) {
      const client = await prisma.client.findFirst({
        where: { id: data.cliente_id, tenantId },
      });
      if (!client) {
        throw new Error('CLIENT_NOT_FOUND');
      }
    }

    const updateData = {};
    if (data.titulo) updateData.title = data.titulo;
    if (data.descricao !== undefined) updateData.description = data.descricao;
    if (data.cliente_id !== undefined) updateData.clientId = data.cliente_id;
    if (data.valor !== undefined) updateData.value = data.valor;
    if (data.probabilidade !== undefined) updateData.probability = data.probabilidade;
    if (data.data_fechamento_prevista !== undefined) {
      updateData.expectedCloseDate = data.data_fechamento_prevista ? new Date(data.data_fechamento_prevista) : null;
    }
    if (data.responsavel_id !== undefined) updateData.ownerUserId = data.responsavel_id;
    if (data.estagio) {
      updateData.stage = data.estagio;
      if (data.estagio === 'won' || data.estagio === 'lost') {
        updateData.closedAt = new Date();
      } else {
        updateData.closedAt = null;
      }
    }

    return prisma.opportunity.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async deletar(id, tenantId) {
    const opp = await prisma.opportunity.findFirst({
      where: { id, tenantId },
    });

    if (!opp) {
      throw new Error('OPPORTUNITY_NOT_FOUND');
    }

    return prisma.opportunity.delete({
      where: { id },
    });
  }
}

module.exports = new OpportunityService();

