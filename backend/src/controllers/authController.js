const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { logLogin, logLogout } = require('../utils/auditLogger');

// Registrar novo tenant e usuário master
const registrarTenant = async (req, res) => {
  try {
    const { nomeEmpresa, slug, cnpj, emailEmpresa, telefone, endereco, plano, usuarioNome, usuarioEmail, usuarioSenha } = req.body;

    // Validações detalhadas por campo
    const erros = [];

    // Validação do nome da empresa
    if (!nomeEmpresa || nomeEmpresa.trim().length < 2) {
      erros.push({ campo: 'nomeEmpresa', mensagem: 'Nome da empresa deve ter pelo menos 2 caracteres' });
    }

    // Validação do email da empresa
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailEmpresa) {
      erros.push({ campo: 'emailEmpresa', mensagem: 'Email da empresa é obrigatório' });
    } else if (!emailRegex.test(emailEmpresa)) {
      erros.push({ campo: 'emailEmpresa', mensagem: 'Email da empresa inválido' });
    }

    // Validação do CNPJ (se fornecido)
    if (cnpj && cnpj.trim().length > 0) {
      const cnpjLimpo = cnpj.replace(/\D/g, '');
      if (cnpjLimpo.length !== 14) {
        erros.push({ campo: 'cnpj', mensagem: 'CNPJ deve ter 14 dígitos' });
      }
    }

    // Validação do nome do usuário
    if (!usuarioNome || usuarioNome.trim().length < 2) {
      erros.push({ campo: 'usuarioNome', mensagem: 'Nome do usuário deve ter pelo menos 2 caracteres' });
    }

    // Validação do email do usuário
    if (!usuarioEmail) {
      erros.push({ campo: 'usuarioEmail', mensagem: 'Email do usuário é obrigatório' });
    } else if (!emailRegex.test(usuarioEmail)) {
      erros.push({ campo: 'usuarioEmail', mensagem: 'Email do usuário inválido' });
    }

    // Validação da senha
    if (!usuarioSenha) {
      erros.push({ campo: 'usuarioSenha', mensagem: 'Senha é obrigatória' });
    } else if (usuarioSenha.length < 6) {
      erros.push({ campo: 'usuarioSenha', mensagem: 'Senha deve ter no mínimo 6 caracteres' });
    }

    // Se houver erros de validação, retornar
    if (erros.length > 0) {
      return res.status(400).json({
        message: 'Erros de validação',
        code: 'VALIDATION_ERROR',
        errors: erros
      });
    }

    // Verificar se email da empresa já existe
    const tenantExistente = await prisma.tenant.findUnique({
      where: { email: emailEmpresa }
    });

    if (tenantExistente) {
      return res.status(409).json({
        message: 'Email da empresa já cadastrado',
        code: 'TENANT_EMAIL_EXISTS',
        field: 'emailEmpresa'
      });
    }

    // Verificar se email do usuário já existe
    const usuarioExistente = await prisma.user.findFirst({
      where: { email: usuarioEmail }
    });

    if (usuarioExistente) {
      return res.status(409).json({
        message: 'Email do usuário já cadastrado',
        code: 'USER_EMAIL_EXISTS',
        field: 'usuarioEmail'
      });
    }

    // Hash da senha
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(usuarioSenha, salt);

    // Criar tenant e usuário em transação
    const result = await prisma.$transaction(async (tx) => {
      // Criar tenant
      const tenant = await tx.tenant.create({
        data: {
          name: nomeEmpresa,
          slug: slug || nomeEmpresa.toLowerCase().replace(/\s+/g, '-'),
          cnpj: cnpj || null,
          email: emailEmpresa,
          phone: telefone || null,
          address: endereco || null,
          plan: plano || 'basic',
        }
      });

      // Criar usuário master
      const usuario = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: usuarioNome,
          email: usuarioEmail,
          password: senhaHash,
          role: 'ADMIN',
          emailVerified: true,
        }
      });

      // Ativar módulos padrão
      const modulosPadrao = ['dashboard', 'crm', 'chamados', 'ecommerce', 'membros'];
      for (const modulo of modulosPadrao) {
        await tx.tenantModule.create({
          data: {
            tenantId: tenant.id,
            module: modulo,
            active: true,
          }
        });
      }

      // Criar assinatura inicial
      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          status: 'INCOMPLETE',
          planId: plano || 'basic',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }
      });

      return { tenant, usuario };
    });

    // Gerar token JWT
    const token = jwt.sign(
      { id: result.usuario.id, tenantId: result.tenant.id, email: result.usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Registrar sessão online
    await prisma.onlineSession.create({
      data: {
        userId: result.usuario.id,
        tenantId: result.tenant.id,
        token,
      }
    });

    res.status(201).json({
      message: 'Empresa e usuário cadastrados com sucesso',
      tenant: {
        id: result.tenant.id,
        nome: result.tenant.name,
        email: result.tenant.email,
        plano: result.tenant.plan,
      },
      usuario: {
        id: result.usuario.id,
        nome: result.usuario.name,
        email: result.usuario.email,
        cargo: result.usuario.role,
      },
      token,
    });

  } catch (error) {
    console.error('Erro ao registrar tenant:', error);
    res.status(500).json({
      message: 'Erro ao registrar empresa',
      error: error.message,
    });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        message: 'Email e senha são obrigatórios',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Buscar usuário com tenant
    // NOTA: O email NÃO é único globalmente (é único por tenant: @@unique([tenantId, email]))
    // Por isso usamos findFirst em vez de findUnique
    const user = await prisma.user.findFirst({
      where: { email },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            plan: true,
            active: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        message: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verificar se usuário e tenant estão ativos
    if (!user.active) {
      return res.status(403).json({
        message: 'Conta desativada',
        code: 'ACCOUNT_DISABLED'
      });
    }

    if (!user.tenant.active) {
      return res.status(403).json({
        message: 'Empresa desativada',
        code: 'TENANT_DISABLED'
      });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, user.password);
    if (!senhaValida) {
      return res.status(401).json({
        message: 'Senha incorreta',
        code: 'INVALID_PASSWORD'
      });
    }

    // Gerar JWT
    const token = jwt.sign(
      { id: user.id, tenantId: user.tenantId, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Registrar sessão
    await prisma.onlineSession.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        token,
      }
    });

    // Atualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // 📝 Audit Log: registrar login
    logLogin({ id: user.id, email: user.email, tenantId: user.tenantId }, req);

    // Buscar módulos ativos
    const modulos = await prisma.tenantModule.findMany({
      where: {
        tenantId: user.tenantId,
        active: true
      },
      select: { module: true }
    });

    res.json({
      message: 'Login realizado com sucesso',
      usuario: {
        id: user.id,
        nome: user.name,
        email: user.email,
        cargo: user.role,
        tenant: {
          id: user.tenant.id,
          nome: user.tenant.name,
          plano: user.tenant.plan,
        },
        modulos: modulos.map(m => m.module),
      },
      token,
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      message: 'Erro ao realizar login',
      error: error.message,
    });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token && req.userOnlineId) {
      await prisma.onlineSession.delete({
        where: { id: req.userOnlineId }
      });
    }

    // 📝 Audit Log: registrar logout
    if (req.user) {
      logLogout({ id: req.user.id, email: req.user.email, tenantId: req.user.tenantId }, req);
    }

    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({
      message: 'Erro ao realizar logout',
    });
  }
};

// Obter perfil do usuário logado
const perfil = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        emailVerified: true,
        lastLogin: true,
        createdAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            plan: true,
            subscriptions: {
              select: {
                status: true,
                currentPeriodEnd: true
              }
            }
          }
        }
      }
    });

    // Buscar módulos ativos
    const modulos = await prisma.tenantModule.findMany({
      where: {
        tenantId: user.tenant.id,
        active: true
      },
      select: { module: true }
    });

    res.json({
      usuario: {
        ...user,
        modulos: modulos.map(m => m.module)
      },
    });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({
      message: 'Erro ao buscar perfil',
    });
  }
};

// Atualizar perfil
const atualizarPerfil = async (req, res) => {
  try {
    const { nome, email } = req.body;
    const userId = req.user.id;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(nome && { name: nome }),
        ...(email && { email }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    });

    res.json({
      message: 'Perfil atualizado com sucesso',
      usuario: user,
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({
      message: 'Erro ao atualizar perfil',
    });
  }
};

module.exports = {
  registrarTenant,
  login,
  logout,
  perfil,
  atualizarPerfil,
};