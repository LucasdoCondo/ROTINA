import { Router } from 'express';
import { validate } from '../../middlewares/http.js';
import { requireRole } from '../../middlewares/auth.js';
import { getMyTenant, updateMyTenant } from './tenants.controller.js';
import { updateTenantSchema } from './tenants.schema.js';

export const tenantsRoutes = Router();

// Las rutas cuelgan bajo tenantIsolation (montado en v1), por lo que ya hay
// contexto de tenant. El administrador puede actualizar el perfil del tenant.
tenantsRoutes.get('/me', getMyTenant);
tenantsRoutes.patch('/me', requireRole('ADMIN'), validate(updateTenantSchema, 'body'), updateMyTenant);