import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { HttpError, isOperationalError } from '../shared/errors.js';
import { logger } from '../shared/logger.js';
import { IS_PRODUCTION } from '../config/env.js';

/** Ruta 404 para cualquier endpoint no registrado. */
export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
};

/**
 * Error-handler global. Convierte la jerarquía HttpError en respuestas JSON
 * consistentes y NUNCA expone stack traces ni mensajes internos en producción.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = (req as { id?: string | number }).id;

  // Errores conocidos de la aplicación
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    });
    return;
  }

  // Errores de Prisma → traducir a HTTP correcto
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = mapPrismaError(err);
    res.status(mapped.status).json({
      success: false,
      error: { code: mapped.code, message: mapped.message, requestId },
    });
    return;
  }

  // Errores desconocidos
  if (!isOperationalError(err)) {
    logger.error({ err, requestId }, 'Unhandled error');
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: IS_PRODUCTION ? 'Something went wrong' : String(err),
      requestId,
    },
  });
};

function mapPrismaError(err: Prisma.PrismaClientKnownRequestError): {
  status: number;
  code: string;
  message: string;
} {
  switch (err.code) {
    case 'P2002':
      return { status: 409, code: 'CONFLICT', message: 'Unique constraint violated' };
    case 'P2003':
      return { status: 400, code: 'FOREIGN_KEY_VIOLATION', message: 'Related record not found' };
    case 'P2025':
      return { status: 404, code: 'NOT_FOUND', message: 'Record not found' };
    default:
      return { status: 400, code: 'PRISMA_ERROR', message: 'Database error (known)' };
  }
}