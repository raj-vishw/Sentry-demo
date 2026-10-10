import type { NextFunction, Request, Response } from 'express';
import { MongooseError } from 'mongoose';
import { MulterError } from 'multer';
import { AppError } from '../utils/errors.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { isProduction } from '../config/env.js';

export function notFoundHandler(req: Request, res: Response) {
  sendError(res, 404, 'NOT_FOUND', `No route for ${req.method} ${req.originalUrl}`);
}

interface MongoDuplicateKeyError extends Error {
  code?: number;
  keyPattern?: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.originalUrl }, 'Unhandled application error');
    }
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'Upload is too large.');
      return;
    }
    sendError(res, 400, 'VALIDATION_ERROR', 'Invalid upload.');
    return;
  }

  const mongoErr = err as MongoDuplicateKeyError;
  if (mongoErr?.code === 11000) {
    const field = Object.keys(mongoErr.keyPattern ?? {})[0] ?? 'field';
    sendError(res, 409, 'CONFLICT', `That ${field} is already in use.`);
    return;
  }

  if (err instanceof MongooseError) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Invalid request data.');
    return;
  }

  logger.error({ err, path: req.originalUrl }, 'Unexpected error');
  sendError(
    res,
    500,
    'INTERNAL_ERROR',
    isProduction ? 'Something went wrong. Please try again.' : String((err as Error)?.message ?? err),
  );
}
