import { Router } from 'express';
import { validate } from '../../middlewares/http.js';
import { requireActiveUser, requireRole } from '../../middlewares/auth.js';
import {
  createCustomerSchema,
  customerParamSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from './customers.schema.js';
import {
  createDealSchema,
  dealParamSchema,
  listDealsQuerySchema,
  moveDealStageSchema,
  updateDealSchema,
} from './deals.schema.js';
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from './customers.controller.js';
import {
  createDeal,
  deleteDeal,
  getDeal,
  getDealFunnel,
  listDeals,
  moveDealStageHandler,
  updateDealHandler,
} from './deals.controller.js';

/**
 * Rotas do CRM (/api/v1/crm/*).
 * Módulo STAFF: apenas ADMIN/AGENT têm acesso (MEMBER recebe 403).
 * As rotas já cuelgan bajo tenantIsolation (v1 router): aqui só RBAC.
 */
export const crmRoutes = Router();

crmRoutes.use(requireActiveUser, requireRole('ADMIN', 'AGENT'));

// ---------- Customers ----------
crmRoutes.get('/customers', validate(listCustomersQuerySchema, 'query'), listCustomers);
crmRoutes.post('/customers', validate(createCustomerSchema, 'body'), createCustomer);
crmRoutes.get(
  '/customers/:id',
  validate(customerParamSchema, 'params'),
  getCustomer,
);
crmRoutes.patch(
  '/customers/:id',
  validate(customerParamSchema, 'params'),
  validate(updateCustomerSchema, 'body'),
  updateCustomer,
);
crmRoutes.delete(
  '/customers/:id',
  validate(customerParamSchema, 'params'),
  requireRole('ADMIN'),
  deleteCustomer,
);

// ---------- Deals (funil de vendas) ----------
// IMPORTANTE: '/funnel' antes de '/:id' para não colidir com o param.
crmRoutes.get('/deals/funnel', getDealFunnel);
crmRoutes.get('/deals', validate(listDealsQuerySchema, 'query'), listDeals);
crmRoutes.post('/deals', validate(createDealSchema, 'body'), createDeal);
crmRoutes.get('/deals/:id', validate(dealParamSchema, 'params'), getDeal);
crmRoutes.patch(
  '/deals/:id',
  validate(dealParamSchema, 'params'),
  validate(updateDealSchema, 'body'),
  updateDealHandler,
);
crmRoutes.patch(
  '/deals/:id/stage',
  validate(dealParamSchema, 'params'),
  validate(moveDealStageSchema, 'body'),
  moveDealStageHandler,
);
crmRoutes.delete(
  '/deals/:id',
  validate(dealParamSchema, 'params'),
  requireRole('ADMIN'),
  deleteDeal,
);