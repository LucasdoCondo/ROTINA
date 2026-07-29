const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');

class UserService {
  async listar(tenantId, filtros = {}) {
    const { page = 1, limit = 20, search = '' } = filtros;
    const offset = (page - 1) * limit;

    const where = { tenantId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          lastLogin: true,
          createdAt: true,
        }
      }),
      prisma.user.count({ where })
    ]);

    return {
      usuarios: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async buscarPorId(id, tenantId) {
    return prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        active: true,
        lastLogin: true,
        createdAt: true,
      }
    });
  }

  async criar(tenantId, data) {
    const { nome, email, senha, cargo = 'MEMBER', avatar_url } = data;

    // Verificar se email já existe no tenant
    const existing = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } }
    });

    if (existing) {
      throw new Error('EMAIL_EXISTS');
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    return prisma.user.create({
      data: {
        tenantId,
        name: nome,
        email,
        password: senhaHash,
        role: cargo,
        avatarUrl: avatar_url || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      }
    });
  }

  async atualizar(id, tenantId, data) {
    const { nome, email, cargo, ativo } = data;

    const user = await prisma.user.findFirst({
      where: { id, tenantId }
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    return prisma.user.update({
      where: { id },
      data: {
        ...(nome && { name: nome }),
        ...(email && { email }),
        ...(cargo && { role: cargo }),
        ...(ativo !== undefined && { active: ativo }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      }
    });
  }

  async deletar(id, tenantId) {
    const user = await prisma.user.findFirst({
      where: { id, tenantId }
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    return prisma.user.delete({
      where: { id }
    });
  }

  async exportarDados(tenantId, userId) {
    // Buscar todos os dados do usuário incluindo relações
    const usuario = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
            plan: true,
            createdAt: true
          }
        },
        tickets: {
          include: {
            _count: true
          }
        },
        memberSubscriptions: true,
        onlineSessions: {
          select: {
            id: true,
            loginAt: true,
            lastActivity: true
          }
        }
      }
    });

    if (!usuario || usuario.tenantId !== tenantId) {
      throw new Error('USER_NOT_FOUND');
    }

    // Remover senhaHash se existir (não deve ser exportado)
    const { password, ...usuarioSemSenha } = usuario;

    // Montar objeto de exportação com metadados LGPD
    const dadosExportacao = {
      metadata: {
        exportadoEm: new Date().toISOString(),
        finalidade: 'Portabilidade de dados - Direito do titular (LGPD Art. 18, V)',
        tenant: usuario.tenant.name,
        formato: 'JSON'
      },
      dadosPessoais: {
        id: usuarioSemSenha.id,
        nome: usuarioSemSenha.name,
        email: usuarioSemSenha.email,
        role: usuarioSemSenha.role,
        avatarUrl: usuarioSemSenha.avatarUrl,
        emailVerified: usuarioSemSenha.emailVerified,
        active: usuarioSemSenha.active,
        lastLogin: usuarioSemSenha.lastLogin,
        createdAt: usuarioSemSenha.createdAt,
        updatedAt: usuarioSemSenha.updatedAt
      },
      contexto: {
        tenant: usuarioSemSenha.tenant,
        totalTickets: usuarioSemSenha.tickets?.length || 0,
        tickets: usuarioSemSenha.tickets || [],
        assinaturas: usuarioSemSenha.memberSubscriptions || [],
        sessoesAtivas: usuarioSemSenha.onlineSessions || []
      }
    };

    return dadosExportacao;
  }
}

module.exports = new UserService();