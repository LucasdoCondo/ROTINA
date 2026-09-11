/**
 * Jerarquía de errores HTTP de la API.
 * Todos los errores operativos extienden HttpError; el error-handler global
 * traduce esta jerarquía en respuestas JSON consistentes sin filtrar internos.
 */

export type ErrorDetails = unknown;

export class HttpError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: ErrorDetails;
  readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: ErrorDetails,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad request', code = 'BAD_REQUEST', details?: ErrorDetails) {
    super(400, code, message, details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Not enough permissions') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Resource conflict', code = 'CONFLICT', details?: ErrorDetails) {
    super(409, code, message, details);
  }
}

export class UnprocessableEntityError extends HttpError {
  constructor(message = 'Validation failed', code = 'VALIDATION_ERROR', details?: ErrorDetails) {
    super(422, code, message, details);
  }
}

export class TooManyRequestsError extends HttpError {
  constructor(message = 'Too many requests, slow down') {
    super(429, 'RATE_LIMITED', message);
  }
}

/** Error de programación: se intentó una operación fuera del scope de tenant. */
export class TenantScopeError extends HttpError {
  constructor(message = 'Operation attempted outside tenant scope') {
    super(500, 'TENANT_SCOPE_VIOLATION', message);
  }
}

/** Determina si un error desconocido merece log de stack completo. */
export function isOperationalError(err: unknown): boolean {
  return err instanceof HttpError;
}