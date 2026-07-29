/**
 * Controller de Auditoria - Endpoints para visualizar logs de auditoria
 * 
 * Acesso restrito a ADMIN e MANAGER (RBAC: 'settings:view')
 */

const { listAuditLogs, purgeOldLogs } = require('../utils/auditLogger');

const auditController = {
  /**
   * Lista logs de auditoria do tenant
   * GET /api/auditoria?page=1&limit=50&action=DELETE&entity=Client
   */
  async listarLogs(req, res) {
    try {
      const tenantId = req.tenantId;
      const { page, limit, action, entity, userId, startDate, endDate } = req.query;

      const result = await listAuditLogs(tenantId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
        action,
        entity,
        userId,
        startDate,
        endDate,
      });

      res.json(result);

    } catch (error) {
      console.error('Erro ao listar logs de auditoria:', error);
      res.status(500).json({
        message: 'Erro ao listar logs de auditoria',
      });
    }
  },

  /**
   * Obtém um log específico por ID
   * GET /api/auditoria/:id
   */
  async getLog(req, res) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId;
      const prisma = require('../config/prisma');

      const log = await prisma.auditLog.findFirst({
        where: { id, tenantId },
      });

      if (!log) {
        return res.status(404).json({
          message: 'Log não encontrado',
          code: 'LOG_NOT_FOUND'
        });
      }

      res.json({ log });

    } catch (error) {
      console.error('Erro ao buscar log:', error);
      res.status(500).json({
        message: 'Erro ao buscar log',
      });
    }
  },

  /**
   * Estatísticas de auditoria (para dashboard admin)
   * GET /api/auditoria/estatisticas
   */
  async estatisticas(req, res) {
    try {
      const tenantId = req.tenantId;
      const prisma = require('../config/prisma');

      const hoje = new Date();
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
      const inicio7dias = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        totalLogs,
        logsHoje,
        logs7dias,
        acoesPorTipo,
        entidadesMaisAuditadas,
        usuariosMaisAtivos,
      ] = await Promise.all([
        prisma.auditLog.count({ where: { tenantId } }),
        prisma.auditLog.count({
          where: { tenantId, createdAt: { gte: inicioHoje } }
        }),
        prisma.auditLog.count({
          where: { tenantId, createdAt: { gte: inicio7dias } }
        }),
        prisma.auditLog.groupBy({
          by: ['action'],
          where: { tenantId },
          _count: { action: true },
          orderBy: { _count: { action: 'desc' } },
        }),
        prisma.auditLog.groupBy({
          by: ['entity'],
          where: { tenantId },
          _count: { entity: true },
          orderBy: { _count: { entity: 'desc' } },
          take: 5,
        }),
        prisma.auditLog.groupBy({
          by: ['userEmail'],
          where: { tenantId, userEmail: { not: null } },
          _count: { userEmail: true },
          orderBy: { _count: { userEmail: 'desc' } },
          take: 5,
        }),
      ]);

      res.json({
        total: totalLogs,
        hoje: logsHoje,
        ultimos7dias: logs7dias,
        acoes_por_tipo: acoesPorTipo.map(a => ({
          action: a.action,
          total: a._count.action,
        })),
        entidades_mais_auditadas: entidadesMaisAuditadas.map(e => ({
          entity: e.entity,
          total: e._count.entity,
        })),
        usuarios_mais_ativos: usuariosMaisAtivos.map(u => ({
          email: u.userEmail,
          total: u._count.userEmail,
        })),
      });

    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({
        message: 'Erro ao buscar estatísticas',
      });
    }
  },

  /**
   * Remove logs de auditoria antigos (retenção)
   * DELETE /api/auditoria/retention?retentionDays=365
   * 
   * Prática recomendada: tabelas de auditoria crescem rapidamente.
   * Arquive ou apague logs com mais de N dias para economizar armazenamento.
   * Acesso restrito a ADMIN (settings:manage).
   */
  async purgeOldLogs(req, res) {
    try {
      const tenantId = req.tenantId;
      const retentionDays = parseInt(req.query.retentionDays) || 365;

      // Validação: mínimo 30 dias de retenção
      if (retentionDays < 30) {
        return res.status(400).json({
          message: 'O período mínimo de retenção é 30 dias',
          code: 'INVALID_RETENTION_PERIOD',
        });
      }

      const result = await purgeOldLogs(tenantId, retentionDays);

      res.json({
        message: `${result.deletedCount} logs antigos foram removidos`,
        deletedCount: result.deletedCount,
        cutoffDate: result.cutoffDate,
        retentionDays,
      });

    } catch (error) {
      console.error('Erro ao purgar logs antigos:', error);
      res.status(500).json({
        message: 'Erro ao remover logs antigos',
      });
    }
  },
};

module.exports = auditController;
