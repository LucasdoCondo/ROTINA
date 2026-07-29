/**
 * Audit Logger - Helper centralizado para registro de trilha de auditoria
 * 
 * Registra quem fez o quê, quando e em qual entidade.
 * Essencial para sistemas corporativos (ERP, CRM, Chamados).
 * 
 * Regras:
 * - Nunca interrompe a ação principal caso o log falhe
 * - Extrai IP e User-Agent automaticamente da requisição
 * - Armazena oldValues e newValues como JSON para comparação
 * - Sanitiza dados sensíveis (senhas, tokens, cartões) antes de gravar
 */

const prisma = require('../config/prisma');

/**
 * Campos sensíveis que NUNCA devem ser gravados no audit log.
 * Segurança: senhas, tokens, chaves de API e dados de cartão
 * são removidos antes de persistir oldValues/newValues.
 */
const SENSITIVE_FIELDS = [
  'password',
  'senha',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'stripeCustomerId',
  'stripeSubscriptionId',
  'asaasApiKey',
  'cardNumber',
  'card_number',
  'cvv',
  'cvc',
];

/**
 * Remove campos sensíveis de um objeto antes de gravar no log.
 * Substitui o valor por "[REDACTED]" para evidenciar que existia.
 *
 * @param {Object} obj - Objeto a ser sanitizado
 * @returns {Object} Objeto sanitizado
 */
function sanitizeSensitiveData(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = { ...obj };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some(
      (field) => field.toLowerCase() === lowerKey
    );

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (
      sanitized[key] &&
      typeof sanitized[key] === 'object' &&
      !Array.isArray(sanitized[key]) &&
      !(sanitized[key] instanceof Date)
    ) {
      // Recursivo para objetos aninhados
      sanitized[key] = sanitizeSensitiveData(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Registra uma ação no Audit Log
 * 
 * @param {Object} params
 * @param {string} params.tenantId - ID do tenant
 * @param {string} [params.userId] - ID do usuário (opcional para processos do sistema)
 * @param {string} [params.userEmail] - E-mail do usuário
 * @param {string} params.action - Ação: CREATE | UPDATE | DELETE | LOGIN | LOGOUT | EXPORT
 * @param {string} params.entity - Entidade afetada: "Client", "Ticket", "User", etc.
 * @param {string} [params.entityId] - ID do registro afetado
 * @param {Object} [params.oldValues] - Estado ANTES da alteração
 * @param {Object} [params.newValues] - Estado DEPOIS da alteração
 * @param {Object} [params.req] - Objeto req do Express (para extrair IP e User-Agent)
 * @returns {Promise<void>}
 * 
 * @example
 * // Após atualizar um cliente:
 * await logAudit({
 *   tenantId: req.tenantId,
 *   userId: req.user.id,
 *   userEmail: req.user.email,
 *   action: 'UPDATE',
 *   entity: 'Client',
 *   entityId: clientId,
 *   oldValues: { name: currentClient.name, email: currentClient.email },
 *   newValues: { name: updatedClient.name, email: updatedClient.email },
 *   req,
 * });
 */
async function logAudit({
  tenantId,
  userId,
  userEmail,
  action,
  entity,
  entityId,
  oldValues,
  newValues,
  req,
}) {
  try {
    let ipAddress;
    let userAgent;

    // Extrair IP e User-Agent da requisição Express
    if (req) {
      // Considerar proxies (Vercel, Render, nginx)
      const forwarded = req.headers['x-forwarded-for'];
      ipAddress = forwarded
        ? forwarded.split(',')[0].trim()
        : req.ip || req.connection?.remoteAddress;
      
      userAgent = req.headers['user-agent'] || undefined;
    }

    // Sanitizar dados sensíveis ANTES de persistir
    const safeOldValues = oldValues ? sanitizeSensitiveData(oldValues) : undefined;
    const safeNewValues = newValues ? sanitizeSensitiveData(newValues) : undefined;

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        userEmail,
        action,
        entity,
        entityId,
        oldValues: safeOldValues ? JSON.parse(JSON.stringify(safeOldValues)) : undefined,
        newValues: safeNewValues ? JSON.parse(JSON.stringify(safeNewValues)) : undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // NUNCA interromper a ação principal caso o log falhe
    console.error('[AuditLog] Falha ao gravar log de auditoria:', error);
  }
}

/**
 * Registra login no audit log
 * 
 * @param {Object} user - { id, email, tenantId }
 * @param {Object} req - Objeto req do Express
 */
async function logLogin(user, req) {
  return logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    userEmail: user.email,
    action: 'LOGIN',
    entity: 'User',
    entityId: user.id,
    newValues: { loginAt: new Date().toISOString() },
    req,
  });
}

/**
 * Registra logout no audit log
 * 
 * @param {Object} user - { id, email, tenantId }
 * @param {Object} req - Objeto req do Express
 */
async function logLogout(user, req) {
  return logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    userEmail: user.email,
    action: 'LOGOUT',
    entity: 'User',
    entityId: user.id,
    req,
  });
}

/**
 * Registra criação de entidade
 * 
 * @param {string} tenantId
 * @param {Object} user - { id, email }
 * @param {string} entity - Nome da entidade ("Client", "Ticket", etc.)
 * @param {Object} newValues - Dados criados
 * @param {Object} req - Objeto req do Express
 */
async function logCreate(tenantId, user, entity, newValues, req) {
  return logAudit({
    tenantId,
    userId: user?.id,
    userEmail: user?.email,
    action: 'CREATE',
    entity,
    entityId: newValues?.id,
    newValues,
    req,
  });
}

/**
 * Registra atualização de entidade
 * 
 * @param {string} tenantId
 * @param {Object} user - { id, email }
 * @param {string} entity - Nome da entidade
 * @param {string} entityId - ID do registro
 * @param {Object} oldValues - Estado ANTES
 * @param {Object} newValues - Estado DEPOIS
 * @param {Object} req - Objeto req do Express
 */
async function logUpdate(tenantId, user, entity, entityId, oldValues, newValues, req) {
  return logAudit({
    tenantId,
    userId: user?.id,
    userEmail: user?.email,
    action: 'UPDATE',
    entity,
    entityId,
    oldValues,
    newValues,
    req,
  });
}

/**
 * Registra exclusão de entidade
 * 
 * @param {string} tenantId
 * @param {Object} user - { id, email }
 * @param {string} entity - Nome da entidade
 * @param {string} entityId - ID do registro
 * @param {Object} oldValues - Dados do registro excluído
 * @param {Object} req - Objeto req do Express
 */
async function logDelete(tenantId, user, entity, entityId, oldValues, req) {
  return logAudit({
    tenantId,
    userId: user?.id,
    userEmail: user?.email,
    action: 'DELETE',
    entity,
    entityId,
    oldValues,
    req,
  });
}

/**
 * Registra exportação de dados
 * 
 * @param {string} tenantId
 * @param {Object} user - { id, email }
 * @param {string} entity - Entidade exportada
 * @param {Object} req - Objeto req do Express
 */
async function logExport(tenantId, user, entity, req) {
  return logAudit({
    tenantId,
    userId: user?.id,
    userEmail: user?.email,
    action: 'EXPORT',
    entity,
    req,
  });
}

/**
 * Lista logs de auditoria de um tenant com filtros
 * 
 * @param {string} tenantId
 * @param {Object} options - Filtros
 * @param {number} [options.page=1]
 * @param {number} [options.limit=50]
 * @param {string} [options.action] - Filtrar por ação
 * @param {string} [options.entity] - Filtrar por entidade
 * @param {string} [options.userId] - Filtrar por usuário
 * @param {string} [options.startDate] - Data inicial
 * @param {string} [options.endDate] - Data final
 * @returns {Promise<Object>} { logs, pagination }
 */
async function listAuditLogs(tenantId, {
  page = 1,
  limit = 50,
  action,
  entity,
  userId,
  startDate,
  endDate,
} = {}) {
  const where = { tenantId };

  if (action) where.action = action;
  if (entity) where.entity = entity;
  if (userId) where.userId = userId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Remove logs de auditoria antigos (retenção).
 * 
 * Prática recomendada: tabelas de auditoria crescem rapidamente.
 * Execute periodicamente (cron/job) para arquivar ou apagar logs
 * com mais de N dias, economizando armazenamento no PostgreSQL.
 * 
 * @param {string} tenantId - ID do tenant (escopo da limpeza)
 * @param {number} [retentionDays=365] - Dias de retenção (padrão: 1 ano)
 * @returns {Promise<Object>} { deletedCount, cutoffDate }
 */
async function purgeOldLogs(tenantId, retentionDays = 365) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await prisma.auditLog.deleteMany({
    where: {
      tenantId,
      createdAt: { lt: cutoffDate },
    },
  });

  return {
    deletedCount: result.count,
    cutoffDate: cutoffDate.toISOString(),
  };
}

module.exports = {
  logAudit,
  logLogin,
  logLogout,
  logCreate,
  logUpdate,
  logDelete,
  logExport,
  listAuditLogs,
  purgeOldLogs,
  sanitizeSensitiveData,
};