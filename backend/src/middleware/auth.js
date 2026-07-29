const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { hasPermission } = require('./rbac');

// Middleware de autenticação
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Token de acesso não fornecido',
        code: 'TOKEN_MISSING'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verificar se o usuário está online
    const onlineSession = await prisma.onlineSession.findUnique({
      where: { token },
      select: { id: true, userId: true, tenantId: true }
    });

    if (!onlineSession) {
      return res.status(401).json({
        message: 'Token inválido ou sessão expirada',
        code: 'TOKEN_INVALID'
      });
    }

    // Verificar token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar se usuário ainda existe e está ativo
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        role: true,
        active: true
      }
    });

    if (!user) {
      return res.status(401).json({
        message: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.active) {
      return res.status(403).json({
        message: 'Conta desativada',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Atualizar última atividade
    await prisma.onlineSession.update({
      where: { id: onlineSession.id },
      data: { lastActivity: new Date() }
    });

    // Adicionar dados do usuário na requisição
    req.user = {
      id: user.id,
      tenantId: user.tenantId,
      nome: user.name,
      email: user.email,
      cargo: user.role,
    };

    req.tenantId = user.tenantId;
    req.userOnlineId = onlineSession.id;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    console.error('Erro na autenticação:', error);
    return res.status(401).json({
      message: 'Token inválido',
      code: 'TOKEN_INVALID'
    });
  }
};

// Middleware para verificar se usuário é admin (mantido para compatibilidade)
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  const adminRoles = ['ADMIN'];

  if (!adminRoles.includes(req.user.cargo)) {
    return res.status(403).json({
      message: 'Acesso negado. Permissão de administrador necessária',
      code: 'FORBIDDEN'
    });
  }

  next();
};

/**
 * Middleware de autorização baseado em RBAC.
 * 
 * Verifica se o usuário autenticado tem permissão para executar
 * uma ação específica com base em seu cargo (role).
 * 
 * @param {string} action - Ação a ser verificada (ex: 'client:create', 'user:delete')
 * @returns {Function} Middleware Express
 * 
 * @example
 * // Proteger rota de criação de cliente
 * router.post('/', authenticateToken, authorize('client:create'), clientesController.criarCliente);
 * 
 * // Proteger rota de exclusão de usuário
 * router.delete('/:id', authenticateToken, authorize('user:delete'), usuariosController.deletarUsuario);
 */
const authorize = (action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Não autorizado',
        code: 'UNAUTHORIZED'
      });
    }

    const { cargo: role } = req.user;

    if (!hasPermission(role, action)) {
      console.warn(`[RBAC] Acesso negado: ${role} tentou executar "${action}"`);
      
      return res.status(403).json({
        message: `Acesso negado. Permissão "${action}" requerida.`,
        code: 'FORBIDDEN',
        requiredPermission: action,
        userRole: role
      });
    }

    next();
  };
};

// Middleware para verificar acesso ao tenant
const validateTenant = async (req, res, next) => {
  try {
    const tenantId = req.params.tenantId || req.body.tenant_id;

    if (!tenantId) {
      return res.status(400).json({
        message: 'ID do tenant não fornecido',
        code: 'TENANT_MISSING'
      });
    }

    // Verificar se tenant existe e está ativo
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, active: true }
    });

    if (!tenant) {
      return res.status(404).json({
        message: 'Empresa não encontrada',
        code: 'TENANT_NOT_FOUND'
      });
    }

    if (!tenant.active) {
      return res.status(403).json({
        message: 'Empresa desativada',
        code: 'TENANT_DISABLED'
      });
    }

    next();
  } catch (error) {
    console.error('Erro na validação de tenant:', error);
    return res.status(500).json({
      message: 'Erro ao validar tenant',
      code: 'TENANT_VALIDATION_ERROR'
    });
  }
};

// Middleware para verificar assinatura ativa
const validateSubscription = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        message: 'Tenant não identificado',
        code: 'TENANT_MISSING'
      });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { tenantId },
      select: { status: true, currentPeriodEnd: true }
    });

    if (!subscription) {
      return res.status(402).json({
        message: 'Assinatura não encontrada. Contate o suporte.',
        code: 'SUBSCRIPTION_NOT_FOUND'
      });
    }

    if (subscription.status === 'CANCELED' || subscription.status === 'INCOMPLETE') {
      return res.status(402).json({
        message: 'Assinatura inativa. Renove seu plano.',
        code: 'SUBSCRIPTION_INACTIVE'
      });
    }

    if (subscription.status === 'PAST_DUE') {
      return res.status(402).json({
        message: 'Pagamento pendente. Regularize sua assinatura.',
        code: 'SUBSCRIPTION_PAST_DUE'
      });
    }

    if (new Date() > subscription.currentPeriodEnd) {
      return res.status(402).json({
        message: 'Período de assinatura expirado.',
        code: 'SUBSCRIPTION_EXPIRED'
      });
    }

    next();
  } catch (error) {
    console.error('Erro na validação de assinatura:', error);
    return res.status(500).json({
      message: 'Erro ao validar assinatura',
      code: 'SUBSCRIPTION_VALIDATION_ERROR'
    });
  }
};

// Middleware para verificar módulo ativo
const validateModule = (moduleName) => {
  return async (req, res, next) => {
    try {
      const tenantId = req.tenantId;

      const module = await prisma.tenantModule.findUnique({
        where: {
          tenantId_module: {
            tenantId,
            module: moduleName
          }
        },
        select: { active: true }
      });

      if (!module || !module.active) {
        return res.status(403).json({
          message: `Módulo "${moduleName}" não está ativo no seu plano.`,
          code: 'MODULE_INACTIVE'
        });
      }

      next();
    } catch (error) {
      console.error('Erro na validação de módulo:', error);
      return res.status(500).json({
        message: 'Erro ao validar módulo',
        code: 'MODULE_VALIDATION_ERROR'
      });
    }
  };
};

module.exports = {
  authenticateToken,
  isAdmin,
  authorize,
  validateTenant,
  validateSubscription,
  validateModule,
};
