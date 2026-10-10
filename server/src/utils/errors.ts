export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'MAINTENANCE_MODE'
  | 'NOT_IMPLEMENTED'
  | 'INTERNAL_ERROR';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  MAINTENANCE_MODE: 503,
  NOT_IMPLEMENTED: 501,
  INTERNAL_ERROR: 500,
};

/**
 * A known, expected application error. The error middleware trusts its
 * `message` to be safe to show a client; anything not thrown as an AppError
 * is treated as unexpected and given a generic message instead.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = STATUS_BY_CODE[code];
    this.details = details;
  }

  static validation(message: string, details?: unknown) {
    return new AppError('VALIDATION_ERROR', message, details);
  }
  static unauthorized(message = 'Authentication required.') {
    return new AppError('UNAUTHORIZED', message);
  }
  static forbidden(message = 'You do not have permission to perform this action.') {
    return new AppError('FORBIDDEN', message);
  }
  static notFound(message = 'Resource not found.') {
    return new AppError('NOT_FOUND', message);
  }
  static conflict(message: string) {
    return new AppError('CONFLICT', message);
  }
  static rateLimited(message = 'Too many requests. Try again shortly.') {
    return new AppError('RATE_LIMITED', message);
  }
  static payloadTooLarge(message = 'Upload is too large.') {
    return new AppError('PAYLOAD_TOO_LARGE', message);
  }
  static maintenance(message = 'This platform is temporarily down for maintenance.') {
    return new AppError('MAINTENANCE_MODE', message);
  }
  static notImplemented(message: string) {
    return new AppError('NOT_IMPLEMENTED', message);
  }
}
