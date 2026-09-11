import { Router } from 'express';
import { validate } from '../../middlewares/http.js';
import { requireActiveUser, requireRole } from '../../middlewares/auth.js';
import {
  assignTicketSchema,
  createTicketMessageSchema,
  createTicketSchema,
  listTicketMessagesQuerySchema,
  listTicketsQuerySchema,
  ticketParamSchema,
  updateTicketSchema,
} from './tickets.schema.js';
import {
  addTicketMessage,
  assignTicket,
  createTicket,
  deleteTicket,
  getTicket,
  listTicketMessages,
  listTickets,
  updateTicket,
} from './tickets.controller.js';

export const ticketsRoutes = Router();

// Las rutas ya cuelgan bajo tenantIsolation (v1 router): aquí solo RBAC.
ticketsRoutes.use(requireActiveUser);

ticketsRoutes.get('/', validate(listTicketsQuerySchema, 'query'), listTickets);
ticketsRoutes.post('/', validate(createTicketSchema, 'body'), createTicket);

ticketsRoutes.get('/:id', validate(ticketParamSchema, 'params'), getTicket);
ticketsRoutes.patch(
  '/:id',
  validate(ticketParamSchema, 'params'),
  validate(updateTicketSchema, 'body'),
  updateTicket,
);
ticketsRoutes.patch(
  '/:id/assign',
  validate(ticketParamSchema, 'params'),
  validate(assignTicketSchema, 'body'),
  requireRole('ADMIN', 'AGENT'),
  assignTicket,
);

// Interações / histórico (qualquer usuário ativo; RBAC fino no serviço)
ticketsRoutes.get(
  '/:id/messages',
  validate(ticketParamSchema, 'params'),
  validate(listTicketMessagesQuerySchema, 'query'),
  listTicketMessages,
);
ticketsRoutes.post(
  '/:id/messages',
  validate(ticketParamSchema, 'params'),
  validate(createTicketMessageSchema, 'body'),
  addTicketMessage,
);

ticketsRoutes.delete(
  '/:id',
  validate(ticketParamSchema, 'params'),
  requireRole('ADMIN'),
  deleteTicket,
);