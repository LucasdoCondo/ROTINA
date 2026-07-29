const prisma = require('../config/prisma');
const { logExport, logDelete } = require('../utils/auditLogger');

// Exportar dados completos do tenant (LGPD - Direito de portabilidade)
const exportarDadosTenant = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const user = req.user;

    // Buscar tenant com todos os dados relacionados
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        // Dados de usuários
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            avatarUrl: true,
            emailVerified: true,
            active: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        // Clientes
        clients: true,
        // Produtos
        products: true,
        // Pedidos e seus itens
        orders: {
          include: {
            items: true,
          },
        },
        // Assinaturas
        subscriptions: true,
        // Membros
        memberSubscriptions: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        // Chamados
        tickets: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        // Trilha de auditoria (últimos 1000 registros)
        auditLogs: {
          take: 1000,
          orderBy: {
            createdAt: 'desc',
          },
        },
        // Módulos
        modules: {
          where: { active: true },
        },
        // Sessões online
        onlineSessions: {
          select: {
            id: true,
            token: true,
            loginAt: true,
            lastActivity: true,
          },
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({
        message: 'Organização não encontrada',
        code: 'TENANT_NOT_FOUND',
      });
    }

    // 📝 Audit Log: registrar exportação de dados do tenant
    logExport(tenantId, user, 'Tenant', tenantId, req);

    // Montar objeto de exportação
    const dadosExportacao = {
      exportacao: {
        tipo: 'dados_completos_tenant',
        dataExportacao: new Date().toISOString(),
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          email: tenant.email,
          phone: tenant.phone,
          address: tenant.address,
          cnpj: tenant.cnpj,
          plan: tenant.plan,
          active: tenant.active,
          createdAt: tenant.createdAt,
          updatedAt: tenant.updatedAt,
        },
        estatisticas: {
          totalUsuarios: tenant.users.length,
          totalClientes: tenant.clients.length,
          totalProdutos: tenant.products.length,
          totalPedidos: tenant.orders.length,
          totalMembros: tenant.memberSubscriptions.length,
          totalChamados: tenant.tickets.length,
          totalAuditLogs: tenant.auditLogs.length,
        },
        dados: {
          usuarios: tenant.users,
          clientes: tenant.clients,
          produtos: tenant.products,
          pedidos: tenant.orders,
          assinaturas: tenant.subscriptions,
          membros: tenant.memberSubscriptions,
          chamados: tenant.tickets,
          auditoria: tenant.auditLogs,
          modulos: tenant.modules,
          sessoesAtivas: tenant.onlineSessions,
        },
      },
    };

    // Nome do arquivo com data
    const dataArquivo = new Date().toISOString().split('T')[0];
    const nomeArquivo = `export-tenant-${tenant.slug}-${dataArquivo}.json`;

    // Retornar como arquivo JSON para download
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
    res.json(dadosExportacao);

  } catch (error) {
    console.error('Erro ao exportar dados do tenant:', error);
    res.status(500).json({
      message: 'Erro ao exportar dados',
      error: error.message,
    });
  }
};

// Deletar tenant em cascata (LGPD - Direito ao esquecimento)
// Requer confirmação do slug para evitar exclusões acidentais
const excluirTenant = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const user = req.user;

    // Apenas ADMIN pode excluir (middleware isAdmin já valida, mas reforçamos aqui)
    if (user.cargo !== 'ADMIN') {
      return res.status(403).json({
        message: 'Apenas administradores podem excluir a organização',
        code: 'FORBIDDEN'
      });
    }

    // Obter slug de confirmação do body
    const { confirmSlug } = req.body;

    if (!confirmSlug) {
      return res.status(400).json({
        message: 'Confirmação do identificador da empresa é obrigatória',
        code: 'CONFIRMATION_REQUIRED'
      });
    }

    // Verificar se tenant existe e obter o slug
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        users: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({
        message: 'Organização não encontrada',
        code: 'TENANT_NOT_FOUND',
      });
    }

    // Validar slug de confirmação
    if (tenant.slug !== confirmSlug) {
      return res.status(400).json({
        message: 'O nome de confirmação não confere com o identificador da empresa',
        code: 'INVALID_CONFIRMATION'
      });
    }

    // Salvar dados para auditoria ANTES da exclusão
    const dadosAuditoria = {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      usuarios: tenant.users.length,
      dataExclusao: new Date().toISOString(),
    };

    // Excluir tenant (onDelete: Cascade irá remover todos os dados filhos)
    await prisma.tenant.delete({
      where: { id: tenantId },
    });

    // 📝 Audit Log: registrar exclusão
    logDelete(tenantId, user, 'Tenant', tenantId, dadosAuditoria, req);

    res.json({
      success: true,
      message: 'Organização e todos os dados associados foram excluídos com sucesso.',
      dadosExcluidos: {
        tenant: tenant.name,
        usuariosRemovidos: tenant.users.length,
      },
    });

  } catch (error) {
    console.error('Erro ao excluir tenant:', error);
    res.status(500).json({
      message: 'Erro ao excluir organização',
      error: error.message,
    });
  }
};

module.exports = {
  exportarDadosTenant,
  excluirTenant,
};