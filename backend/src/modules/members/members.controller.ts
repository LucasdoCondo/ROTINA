import type { Request, Response } from 'express';
import { asyncHandler } from '../../middlewares/http.js';
import type { AuthenticatedRequest, ValidatedRequest } from '../../types/http.js';
import { clientMetaFrom } from '../../types/models.js';
import { membersService } from './members.service.js';
import type {
  CreateInvitationInput,
  ListMembersQuery,
  MemberParam,
  UpdateMemberInput,
  UpsertSubscriptionInput,
} from './members.schema.js';

/** GET /api/v1/members */
export const listMembers = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const query = (req as ValidatedRequest).validated.query as ListMembersQuery;
  const { rows, meta } = await membersService.list(auth, query);
  res.json({ success: true, data: rows, meta });
});

/** GET /api/v1/members/count-active */
export const countActiveMembers = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const count = await membersService.countActive(auth);
  res.json({ success: true, data: { count } });
});

/** GET /api/v1/members/subscription */
export const getSubscription = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const data = await membersService.getSubscription(auth);
  res.json({ success: true, data });
});

/** PATCH /api/v1/members/subscription */
export const upsertSubscription = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const body = (req as ValidatedRequest).validated.body as UpsertSubscriptionInput;
  const data = await membersService.upsertSubscription(auth, body);
  res.json({ success: true, data });
});

/** GET /api/v1/members/:id */
export const getMember = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const { id } = (req as ValidatedRequest).validated.params as MemberParam;
  const data = await membersService.getById(auth, id);
  res.json({ success: true, data });
});

/** PATCH /api/v1/members/:id */
export const updateMember = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const { id } = (req as ValidatedRequest).validated.params as MemberParam;
  const body = (req as ValidatedRequest).validated.body as UpdateMemberInput;
  const data = await membersService.update(auth, id, body);
  res.json({ success: true, data });
});

/** DELETE /api/v1/members/:id (ADMIN, soft delete) */
export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const { id } = (req as ValidatedRequest).validated.params as MemberParam;
  await membersService.remove(auth, id);
  res.status(204).send();
});

/** POST /api/v1/members/invitations */
export const createInvitation = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const body = (req as ValidatedRequest).validated.body as CreateInvitationInput;
  const result = await membersService.invite(auth, body);
  res.status(201).json({ success: true, data: result });
});

/** POST /api/v1/members/invitations/accept (público — sem JWT) */
export const acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
  const body = (req as ValidatedRequest).validated.body as {
    token: string;
    name: string;
    password: string;
  };
  const result = await membersService.acceptInvitation(body);
  res.status(201).json({ success: true, data: result });
});

/** DELETE /api/v1/members/invitations/:id (revogar convite) */
export const revokeInvitation = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const { id } = (req as ValidatedRequest).validated.params as MemberParam;
  await membersService.revokeInvitation(auth, id);
  res.status(204).send();
});
