import { z } from 'zod';
import type { RequestHandler, Request, Response, NextFunction } from 'express';
import { UnprocessableEntityError } from '../shared/errors.js';

/**
 * Envoltorio para controladores asíncronos.
 * Express 4 no captura excepciones lanzadas en handlers async por defecto;
 * este wrapper las reenvía al error-handler global.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Middleware de validación con Zod.
 * Parsea la ubicación indicada (body | query | params) contra `schema` y
 * acumula el resultado TIPADO en `req.validated[location]`. Si falla → 422.
 *
 * Uso en rutas (múltiples ubicaciones encadenadas sin pisarse):
 *   router.patch('/:id',
 *     validate(ticketParamSchema, 'params'),
 *     validate(updateTicketSchema, 'body'),
 *     asyncHandler(updateTicket));
 */
export function validate<S extends z.ZodTypeAny>(
  schema: S,
  location: 'body' | 'query' | 'params' = 'body',
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const raw = location === 'body' ? req.body : location === 'query' ? req.query : req.params;

    const result = schema.safeParse(raw);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        path: i.path.join('.') || location,
        message: i.message,
      }));
      next(new UnprocessableEntityError('Validation failed', 'VALIDATION_ERROR', issues));
      return;
    }

    (req as unknown as { validated: Record<string, unknown> }).validated = {
      ...(req as unknown as { validated?: Record<string, unknown> }).validated,
      [location]: result.data,
    };
    next();
  };
}