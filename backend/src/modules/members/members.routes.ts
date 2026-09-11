import { Router } from 'express';
import { validate } from '../../middlewares/http.js';
import { requireActiveUser, requireRole } from '../../middlewares/auth.js';
import {
  acceptInvitationSchema,
  createInvitationSchema,
  listMembersQuerySchema,
  memberParamSchema,
  updateMemberSchema,
  upsertSubscriptionSchema,
} from './members.schema.js';
import {
  countActiveMembers,
  createInvitation,
  getMember,
  getSubscription,
  listMembers,
  removeMember,
  revokeInvitation,
  updateMember,
  acceptInvitation,
  upsertSubscription,
} from './members.controller.js';

/**
 * Rotas de Membros/Assinaturas (/api/v1/members/*).
 * Montadas sob tenantIsolation (v1) — exceto aceite de convite, que é
 * público (validado pelo token do convite) e registrado em v1.ts.
 *
 * RBAC:
 * - Listar/ver membros: qualquer usuário ativo do tenant.
 * - Atualizar role/status e excluir: apenas ADMIN.
 * - Convidar: ADMIN/AGENT.
 * - Assinatura: apenas ADMIN (vigência do plano).
 */
export const membersRoutes = Router();

membersRoutes.use(requireActiveUser);

// Assinatura / vigência do plano
membersRoutes.get('/subscription', getSubscription);
membersRoutes.patch(
  '/subscription',
  requireRole('ADMIN'),
  validate(upsertSubscriptionSchema, 'body'),
  upsertSubscription,
);

// Convites
membersRoutes.post(
  '/invitations',
  requireRole('ADMIN', 'AGENT'),
  validate(createInvitationSchema, 'body'),
  createInvitation,
);
membersRoutes.delete(
  '/invitations/:id',
  requireRole('ADMIN', 'AGENT'),
  validate(memberParamSchema, 'params'),
  revokeInvitation,
);

// Membros
membersRoutes.get('/', validate(listMembersQuerySchema, 'query'), listMembers);
membersRoutes.get('/count-active', countActiveMembers);
membersRoutes.get('/:id', validate(memberParamSchema, 'params'), getMember);
membersRoutes.patch(
  '/:id',
  requireRole('ADMIN'),
  validate(memberParamSchema, 'params'),
  validate(updateMemberSchema, 'body'),
  updateMember,
);
membersRoutes.delete(
  '/:id',
  requireRole('ADMIN'),
  validate(memberParamSchema, 'params'),
  removeMember,
);

export default membersRoutes;
