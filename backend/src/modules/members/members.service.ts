import { randomBytes } from 'node:crypto';
import { hashPassword } from '../../shared/password.js';
import { requireTenantContext } from '../../shared/tenant-context.js';
import { BadRequestError, ConflictError } from '../../shared/errors.js';
import { env } from '../../config/env.js';
import { queueEmail } from '../../queues/email.queue.js';
import type { AuthUser } from '../../types/http.js';
import {
  MemberRepository,
  SubscriptionRepository,
  InvitationRepository,
  EntityNotFoundError,
} from './members.repository.js';
import type {
  ListMembersQuery,
  UpdateMemberInput,
  CreateInvitationInput,
  UpsertSubscriptionInput,
} from './members.schema.js';

const memberRepo = new MemberRepository();
const subscriptionRepo = new SubscriptionRepository();
const invitationRepo = new InvitationRepository();

const INVITATION_TTL_DAYS = 7;

export const membersService = {
  async list(_auth: AuthUser, query: ListMembersQuery) {
    requireTenantContext();
    const { rows, total } = await memberRepo.list(query);
    return {
      rows,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  },

  async getById(_auth: AuthUser, id: string) {
    requireTenantContext();
    const member = await memberRepo.findById(id);
    if (!member) throw new EntityNotFoundError('Member', id);
    return member;
  },

  async update(_auth: AuthUser, id: string, input: UpdateMemberInput) {
    requireTenantContext();
    const existing = await memberRepo.findById(id);
    if (!existing) throw new EntityNotFoundError('Member', id);

    if (input.role && input.role !== existing.role && existing.role === 'ADMIN') {
      const adminCount = await memberRepo.list({ page: 1, pageSize: 100, role: 'ADMIN', sort: 'newest' });
      if (adminCount.total <= 1) {
        throw new BadRequestError('Cannot demote the only ADMIN of this tenant', 'LAST_ADMIN');
      }
    }

    return memberRepo.update(id, input);
  },

  async remove(_auth: AuthUser, id: string): Promise<void> {
    requireTenantContext();
    const existing = await memberRepo.findById(id);
    if (!existing) throw new EntityNotFoundError('Member', id);
    await memberRepo.softDelete(id);
  },

  async countActive(_auth: AuthUser): Promise<number> {
    return memberRepo.countActive();
  },

  async invite(auth: AuthUser, input: CreateInvitationInput) {
    const { tenantId } = requireTenantContext();

    const existingUser = await memberRepo.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictError('User already exists in this tenant', 'USER_ALREADY_EXISTS');
    }

    const existingInvite = await invitationRepo.findPendingByEmail(input.email);
    if (existingInvite) {
      throw new ConflictError('Pending invitation already exists for this email', 'INVITATION_ALREADY_EXISTS');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

    const invitation = await invitationRepo.create({
      tenantId,
      email: input.email,
      role: input.role,
      invitedById: auth.userId,
      expiresAt,
      id: token,
    });

    // Fila assíncrona: dispara o e-mail do convite em background (BullMQ).
    // Se Redis estiver indisponível, o job é logado (degradação silenciosa).
    await queueEmail({
      to: input.email,
      subject: `Você foi convidado para o ROTINA`,
      template: 'invitation',
      data: {
        token,
        role: input.role,
        expiresAt: expiresAt.toISOString(),
        appUrl: env.APP_URL,
      },
      dedupeKey: `invitation-${token}`,
    });

    return { invitation, token };
  },

  async acceptInvitation(input: { token: string; name: string; password: string }) {
    const invitation = await invitationRepo.findByToken(input.token);
    if (!invitation) {
      throw new BadRequestError('Invalid invitation token', 'INVALID_INVITATION');
    }
    if (invitation.status !== 'PENDING') {
      throw new BadRequestError('Invitation is no longer valid', 'INVITATION_NOT_PENDING');
    }
    if (invitation.expiresAt < new Date()) {
      await invitationRepo.update(invitation.id, { status: 'EXPIRED' });
      throw new BadRequestError('Invitation has expired', 'INVITATION_EXPIRED');
    }

    const passwordHash = await hashPassword(input.password);
    const existing = await memberRepo.findByEmail(invitation.email);
    if (existing) {
      throw new ConflictError('User already exists', 'USER_ALREADY_EXISTS');
    }

    const newUser = await memberRepo.create({
      tenantId: invitation.tenantId,
      email: invitation.email,
      name: input.name,
      passwordHash,
      role: invitation.role,
      status: 'ACTIVE',
    } as never);

    await invitationRepo.accept(invitation.id, newUser.id);
    return { userId: newUser.id, tenantId: invitation.tenantId };
  },

  async revokeInvitation(_auth: AuthUser, id: string): Promise<void> {
    const invitation = await invitationRepo.findById(id);
    if (!invitation) throw new EntityNotFoundError('Invitation', id);
    if (invitation.status !== 'PENDING') {
      throw new BadRequestError('Only pending invitations can be revoked', 'INVITATION_NOT_PENDING');
    }
    await invitationRepo.update(id, { status: 'REVOKED', revokedAt: new Date() });
  },

  async getSubscription(_auth: AuthUser) {
    const subscription = await subscriptionRepo.findCurrent();
    if (!subscription) throw new EntityNotFoundError('Subscription', 'current');
    return subscription;
  },

  async upsertSubscription(_auth: AuthUser, input: UpsertSubscriptionInput) {
    const { tenantId } = requireTenantContext();
    const current = await subscriptionRepo.findCurrent();
    const data = {
      tenantId,
      ...(input.plan ? { plan: input.plan } : current ? { plan: current.plan } : {}),
      ...(input.status ? { status: input.status } : current ? { status: current.status } : {}),
      ...(input.currentPeriodEnd
        ? { currentPeriodEnd: input.currentPeriodEnd }
        : current
          ? { currentPeriodEnd: current.currentPeriodEnd }
          : { currentPeriodEnd: new Date(Date.now() + 365 * 86_400_000) }),
      ...(input.trialEndsAt !== undefined ? { trialEndsAt: input.trialEndsAt } : {}),
      ...(input.cancelAtPeriodEnd !== undefined ? { cancelAtPeriodEnd: input.cancelAtPeriodEnd } : {}),
    };
    return subscriptionRepo.upsert(data);
  },
};
