import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma as prismaClient } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { ConflictError, ForbiddenError, UnauthorizedError } from '../../shared/errors.js';
import { hashPassword, verifyPassword } from '../../shared/password.js';
import { signAccessToken } from '../../shared/jwt.js';
import type { TenantSummary } from '../../types/models.js';
import type { LoginInput, RegisterInput } from './auth.schema.js';
import type { UserRoleValue } from '../../domain/constants.js';

/**
 * Servicio de autenticación.
 *
 * - Access token: JWT firmado, TTL corto (15m), claims de tenant/role.
 * - Refresh token: opaco (256 bits), guardado SOLO como hash (Argon2id),
 *   rotación en cada refresh y revocación explícita (logout).
 */

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRoleValue;
  };
  tenant: TenantSummary;
}

interface ClientMeta {
  userAgent?: string;
  ipAddress?: string;
}

function refreshTokenDigest(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

const USER_AUTH_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  tenantId: true,
  passwordHash: true,
  tenant: { select: { id: true, name: true, slug: true, plan: true, status: true, deletedAt: true } },
} as const;

type UserWithTenant = {
  id: string;
  name: string;
  email: string;
  role: UserRoleValue;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  tenantId: string;
  tenant: TenantSummary;
};

function toAuthResult(user: UserWithTenant, accessToken: string, refreshToken: string): AuthResult {
  return {
    accessToken,
    refreshToken,
    // ventana de expiración del access token (JWT_ACCESS_TTL = 15m)
    expiresIn: 900,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    tenant: user.tenant,
  };
}

async function issueRefreshToken(
  tx: Prisma.TransactionClient,
  params: { userId: string; tenantId: string; meta: ClientMeta },
): Promise<{ refreshToken: string }> {
  const refreshToken =
    crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
  const refreshHash = refreshTokenDigest(refreshToken);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);

  await tx.refreshToken.create({
    data: {
      userId: params.userId,
      tenantId: params.tenantId,
      token: refreshHash,
      expiresAt,
      userAgent: params.meta.userAgent?.slice(0, 255),
      ipAddress: params.meta.ipAddress?.slice(0, 45),
    },
  });

  return { refreshToken };
}

/** Rechaza usuarios cuyo estado no permita operar. */
function assertUserAllowed(user: UserWithTenant): void {
  if (user.status !== 'ACTIVE') {
    throw new ForbiddenError('User is not active (pending/suspended)');
  }
}

export const authService = {
  /**
   * Registro SaaS: crea el tenant y el primer usuario ADMIN, e inicia sesión.
   * Todo en una transacción; si algo falla, no queda estado a medias.
   */
  async register(input: RegisterInput, meta: ClientMeta): Promise<AuthResult> {
    const { tenantName, tenantSlug, adminName, adminEmail, password } = input;

    const existing = await prismaClient.tenant.findUnique({ where: { slug: tenantSlug } });
    if (existing) throw new ConflictError('Tenant slug already taken', 'TENANT_SLUG_TAKEN');

    const passwordHash = await hashPassword(password);

    return prismaClient.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          slug: tenantSlug,
          contactEmail: adminEmail,
          status: 'ACTIVE', // plan FREE por defecto; la lógica de trial entra en la etapa de Billing
          plan: 'FREE',
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: adminEmail,
          passwordHash,
          name: adminName,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });

      const { refreshToken } = await issueRefreshToken(tx, {
        userId: user.id,
        tenantId: tenant.id,
        meta,
      });

      const accessToken = signAccessToken({
        id: user.id,
        tenantId: tenant.id,
        role: user.role,
        status: user.status,
      });

      return toAuthResult(
        {
          ...user,
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            plan: tenant.plan,
            status: tenant.status,
            deletedAt: null,
          },
        } as unknown as UserWithTenant,
        accessToken,
        refreshToken,
      );
    });
  },

  /** Login: verifica tenant + credenciales + estado del usuario y abre sesión. */
  async login(input: LoginInput, meta: ClientMeta): Promise<AuthResult> {
    const { tenantSlug, email, password } = input;

    const tenant = await prismaClient.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant || tenant.deletedAt !== null || tenant.status !== 'ACTIVE') {
      throw new UnauthorizedError('Invalid credentials');
    }

    const user = await prismaClient.user.findFirst({
      where: { tenantId: tenant.id, email, deletedAt: null },
      select: USER_AUTH_SELECT,
    });
    if (!user) throw new UnauthorizedError('Invalid credentials');

    const valid = await verifyPassword(user.passwordHash, password);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    assertUserAllowed(user as UserWithTenant);

    const { refreshToken } = await issueRefreshToken(prismaClient, {
      userId: user.id,
      tenantId: tenant.id,
      meta,
    });

    const accessToken = signAccessToken({
      id: user.id,
      tenantId: tenant.id,
      role: user.role,
      status: user.status,
    });

    return toAuthResult(user as UserWithTenant, accessToken, refreshToken);
  },

  /**
   * Refresh con rotación: revoca el token presentado y emite un par nuevo.
   * Si el token es inválido/revocado/vencido → 401 (se fuerza re-login).
   * Si el MISMO token se presenta dos veces (reuse) → se cierran todas las
   * sesiones del usuario como medida anti-robo.
   */
  async refresh(rawToken: string, meta: ClientMeta): Promise<AuthResult> {
    const refreshHash = refreshTokenDigest(rawToken);

    const refresh = await prismaClient.refreshToken.findFirst({
      where: { token: refreshHash },
      include: { user: { select: USER_AUTH_SELECT } },
    });
    if (!refresh || refresh.revokedAt !== null) {
      throw new UnauthorizedError('Invalid refresh token');
    }
    if (refresh.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token expired');
    }

    const user = refresh.user as UserWithTenant;
    if (user.status !== 'ACTIVE') throw new ForbiddenError('User is not active');
    if (user.tenant.status !== 'ACTIVE' || user.tenant.deletedAt !== null) {
      throw new UnauthorizedError('Tenant is not active');
    }

    return prismaClient.$transaction(async (tx) => {
      const revoked = await tx.refreshToken.findFirst({
        where: { token: refreshHash, revokedAt: { not: null } },
      });
      if (revoked) {
        // Reuso detectado: posible robo del token → revoca TODAS las sesiones
        await tx.refreshToken.updateMany({
          where: { tenantId: refresh.tenantId, userId: refresh.userId },
          data: { revokedAt: new Date() },
        });
        throw new UnauthorizedError('Refresh token reuse detected');
      }

      await tx.refreshToken.updateMany({
        where: { id: refresh.id, tenantId: refresh.tenantId },
        data: { revokedAt: new Date() },
      });

      const { refreshToken } = await issueRefreshToken(tx, {
        userId: user.id,
        tenantId: user.tenantId,
        meta,
      });

      const accessToken = signAccessToken({
        id: user.id,
        tenantId: user.tenantId,
        role: user.role,
        status: user.status,
      });

      return toAuthResult(user, accessToken, refreshToken);
    });
  },

  /** Logout: revoca la sesión asociada al refresh token presentado. */
  async logout(rawToken: string): Promise<void> {
    const refreshHash = refreshTokenDigest(rawToken);
    await prismaClient.refreshToken.updateMany({
      where: { token: refreshHash },
      data: { revokedAt: new Date() },
    });
  },
};
