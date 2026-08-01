const tenantService = require('../services/tenantService');
const ticketService = require('../services/ticketService');
const clientService = require('../services/clientService');
const orderService = require('../services/orderService');
const productService = require('../services/productService');
const prisma = require('../config/prisma');
const { logDelete } = require('../utils/auditLogger');

// Obter dados do dashboard principal
const getDashboard = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    const [
      estatisticas,
      chamadosRecentes,
      pedidosRecentes,
      usuariosOnline,
      vendasSemana,
      topProdutos
    ] = await Promise.all([
      tenantService.getDashboardStats(tenantId),
      prisma.ticket.findMany({
        where: { tenantId },
        orderBy: { openedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          priority: true,
          status: true,
          openedAt: true,
        }
      }),
      prisma.order.findMany({
        where: { tenantId },
        orderBy: { orderDate: 'desc' },
        take: 5,
        select: {
          id: true,
          totalAmount: true,
          status: true,
          orderDate: true,
          client: {
            select: { name: true }
          }
        }
      }),
      prisma.onlineSession.count({
        where: { tenantId }
      }),
      orderService.getVendasPorDia(tenantId, 7),
      productService.getTopProdutos(tenantId, 5)
    ]);

    res.json({
      estatisticas,
      chamados_recentes: chamadosRecentes.map(c => ({
        id: c.id,
        titulo: c.title,
        prioridade: c.priority,
        status: c.status,
        data_abertura: c.openedAt,
      })),
      pedidos_recentes: pedidosRecentes.map(p => ({
        id: p.id,
        valor_total: p.totalAmount,
        status: p.status,
        data_pedido: p.orderDate,
        cliente_nome: p.client.name,
      })),
      usuarios_online: { total: usuariosOnline },
      vendas_semana: vendasSemana,
      top_produtos: topProdutos,
    });

  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({
      message: 'Erro ao carregar dashboard',
      error: error.message,
    });
  }
};

// Obter dados para gráficos
const getGraficos = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { periodo = '30' } = req.query;

    const [vendasPorDia, chamadosPorStatus, novosClientes] = await Promise.all([
      orderService.getVendasPorDia(tenantId, parseInt(periodo)),
      ticketService.getStats(tenantId, parseInt(periodo)),
      clientService.getNovosClientesPorMes(tenantId),
    ]);

    res.json({
      vendas_por_dia: vendasPorDia,
      chamados_por_status: chamadosPorStatus,
      novos_clientes: novosClientes,
    });

  } catch (error) {
    console.error('Erro ao buscar gráficos:', error);
    res.status(500).json({
      message: 'Erro ao carregar gráficos',
      error: error.message,
    });
  }
};

// Excluir tenant/organização (ADMIN only) - LGPD Direito ao Esquecimento
const deletarTenant = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const usuarioAdmin = req.user;

    // Buscar dados do tenant antes de excluir (para audit log)
    const tenantExcluido = await tenantService.buscarPorId(tenantId);

    if (!tenantExcluido) {
      return res.status(404).json({
        message: 'Organização não encontrada',
        code: 'TENANT_NOT_FOUND'
      });
    }

    // Confirmar exclusão (segurança: não permitir undo automático)
    // Executar exclusão em cascata (onDelete: Cascade no schema)
    await tenantService.excluir(tenantId);

    // 📝 Audit Log: registrar exclusão com oldValues
    await logDelete(tenantId, usuarioAdmin, 'Tenant', tenantId, tenantExcluido, req);

    res.json({
      message: 'Organização excluída permanentemente',
      tenantId,
    });

  } catch (error) {
    console.error('Erro ao excluir tenant:', error);
    res.status(500).json({
      message: 'Erro ao excluir organização',
      error: error.message,
    });
  }
};

// Obter atividades recentes
const getAtividadesRecentes = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    const acessosRecentes = await prisma.onlineSession.findMany({
      where: { tenantId },
      orderBy: { lastActivity: 'desc' },
      take: 10,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    });

    res.json({
      acessos_recentes: acessosRecentes.map(a => ({
        nome: a.user.name,
        email: a.user.email,
        data_login: a.loginAt,
        data_ultima_atividade: a.lastActivity,
      })),
    });

  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    res.status(500).json({
      message: 'Erro ao carregar atividades',
      error: error.message,
    });
  }
};

module.exports = {
  getDashboard,
  getGraficos,
  getAtividadesRecentes,
  deletarTenant,
};