import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validation.middleware.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';
import { loginSchema } from '../validators/auth.schema.js';

// Mounted at the same hidden prefix as the rest of the admin API (see
// app.ts), but kept as its own router rather than living inside
// admin.routes.ts — that router applies requireAuth to everything under it,
// and login necessarily happens before a token exists.
const router = Router();

router.post('/login', authLimiter, validate(loginSchema), authController.adminLogin);

export default router;
