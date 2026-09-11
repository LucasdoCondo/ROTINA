import type { Request, Response } from 'express';
import { asyncHandler } from '../../middlewares/http.js';
import type { AuthenticatedRequest, ValidatedRequest } from '../../types/http.js';
import { ticketService } from './tickets.service.js';
import type {
  AssignTicketInput,
  CreateTicketInput,
  CreateTicketMessageInput,
  ListTicketMessagesQuery,
  ListTicketsQuery,
  TicketParam,
  UpdateTicketInput,
} from './tickets.schema.js';

/** GET /api/v1/tickets */
export const listTickets = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const query = (req as ValidatedRequest).validated.query as ListTicketsQuery;

  const { rows, meta } = await ticketService.list(auth, query);
  res.json({ success: true, data: rows, meta });
});

/** POST /api/v1/tickets */
export const createTicket = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const body = (req as ValidatedRequest).validated.body as CreateTicketInput;

  const data = await ticketService.create(auth, body);
  res.status(201).json({ success: true, data });
});

/** GET /api/v1/tickets/:id */
export const getTicket = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const { id } = (req as ValidatedRequest).validated.params as TicketParam;

  const data = await ticketService.getById(auth, id);
  res.json({ success: true, data });
});

/** PATCH /api/v1/tickets/:id */
export const updateTicket = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const { id } = (req as ValidatedRequest).validated.params as TicketParam;
  const body = (req as ValidatedRequest).validated.body as UpdateTicketInput;

  const data = await ticketService.update(auth, id, body);
  res.json({ success: true, data });
});

/** PATCH /api/v1/tickets/:id/assign (ADMIN | AGENT) */
export const assignTicket = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const { id } = (req as ValidatedRequest).validated.params as TicketParam;
  const body = (req as ValidatedRequest).validated.body as AssignTicketInput;

  const data = await ticketService.assign(auth, id, body);
  res.json({ success: true, data });
});

/** DELETE /api/v1/tickets/:id (ADMIN, soft delete) */
export const deleteTicket = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const { id } = (req as ValidatedRequest).validated.params as TicketParam;

  await ticketService.remove(auth, id);
  res.status(204).send();
});

// ---------- Interações / histórico ----------

/** GET /api/v1/tickets/:id/messages — histórico cronológico */
export const listTicketMessages = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const { id } = (req as ValidatedRequest).validated.params as TicketParam;
  const query = (req as ValidatedRequest).validated.query as ListTicketMessagesQuery;

  const data = await ticketService.listMessages(auth, id, query.limit);
  res.json({ success: true, data });
});

/** POST /api/v1/tickets/:id/messages — nova interação */
export const addTicketMessage = asyncHandler(async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  const { id } = (req as ValidatedRequest).validated.params as TicketParam;
  const body = (req as ValidatedRequest).validated.body as CreateTicketMessageInput;

  const data = await ticketService.addMessage(auth, id, body);
  res.status(201).json({ success: true, data });
});