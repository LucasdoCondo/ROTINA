/**
 * Controller de Convites de Equipe
 *
 * Permite que ADMIN/MANAGER invite membros por e-mail.
 * El flujo completo:
 * 1. POST /api/invites            → crea el Invite + envía InviteEmail
 * 2. Usuario hace clic en el link  → /aceitar-convite?token=...
 * 3. POST /api/auth/aceitar-convite → crea el User + auto-login
 *
 * Seguridad:
 * - tenantId siempre desde req.tenantId (JWT)
 * - Tokens aleatorios de 12 bytes (96 bits) con expiración de 7 días
 * - El e-mail NUNCA se interpola en auditoría (sanitizado)
 */

const crypto = require('node:crypto');
const prisma = require('../config/prisma');
const emailService = require('../services/emailService');
const { logCreate } = require('../utils/auditLogger');

const INVITE_TTL_DAYS = 7;

const inviteController = {
  /**
   * Lista convites pendientes del tenant
   * GET /api/invites
   */
  async listar(req, res) {
    const tenantId = req.tenantId;

    const invites = await prisma.invite.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json({
      invites: invites.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        expiresAt: inv.expiresAt,
        acceptedAt: inv.acceptedAt,
        createdAt: inv.createdAt,
      })),
      total: invites.length,
    });
  },

  /**
   * Crea un convite y envía el InviteEmail
   * POST /api/invites  { email, role }
   */
  async convidar(req, res) {
    const tenantId = req.tenantId;
    const inviter = req.user;
    const { email, role = 'MEMBER' } = req.body;

    // Validaciones
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({
        message: 'E-mail inválido',
        code: 'INVALID_EMAIL',
      });
    }

    if (!['ADMIN', 'MANAGER', 'MEMBER'].includes(role)) {
      return res.status(400).json({
        message: 'Cargo inválido. Use ADMIN, MANAGER ou MEMBER',
        code: 'INVALID_ROLE',
      });
    }

    const emailNormalizado = email.toLowerCase();

    // Verificar que el email no sea ya un usuario del tenant
    const existingUser = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: emailNormalizado } },
      select: { id: true },
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'Este e-mail já pertence a esta organização',
        code: 'USER_ALREADY_MEMBER',
      });
    }

    // Evitar convites duplicados pendientes para el mismo e-mail
    const pendingInvite = await prisma.invite.findFirst({
      where: {
        tenantId,
        email: emailNormalizado,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (pendingInvite) {
      return res.status(409).json({
        message: 'Já existe um convite pendente para este e-mail',
        code: 'PENDING_INVITE_EXISTS',
      });
    }

    // Datos del tenant (para el e-mail)
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    // Generar token seguro
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    // Persistir el convite
    const invite = await prisma.invite.create({
      data: {
        tenantId,
        email: emailNormalizado,
        token,
        role,
        invitedById: inviter.id,
        expiresAt,
      },
    });

    // 📧 Enviar InviteEmail (asíncrono — nunca bloquea la creación)
    emailService.sendMemberInvite(
      { name: inviter.nome, email: inviter.email },
      emailNormalizado,
      tenant?.name || 'Empresa',
      token
    );

    // 📝 Audit Log
    logCreate(tenantId, inviter, 'Invite', { email: emailNormalizado, role, expiresAt }, req);

    res.status(201).json({
      message: 'Convite enviado com sucesso',
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
      },
    });
  },

  /**
   * Revoca un convite pendiente
   * DELETE /api/invites/:id
   */
  async revocar(req, res) {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const invite = await prisma.invite.findFirst({
      where: { id, tenantId, acceptedAt: null },
      select: { id: true },
    });

    if (!invite) {
      return res.status(404).json({
        message: 'Convite não encontrado ou já utilizado',
        code: 'INVITE_NOT_FOUND',
      });
    }

    await prisma.invite.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Convite revogado com sucesso',
    });
  },
};

module.exports = inviteController;