import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../models/User.js';
import { AppError } from '../utils/errors.js';

/**
 * Must run after `requireAuth`. Authorization is enforced here, on the
 * server, unconditionally — never inferred from anything the frontend
 * decides to hide or show.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(AppError.forbidden());
      return;
    }
    next();
  };
}
