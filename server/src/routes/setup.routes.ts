import { Router } from 'express';
import * as setupController from '../controllers/setup.controller.js';
import { validate } from '../middleware/validation.middleware.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';
import { initializeSetupSchema } from '../validators/setup.schema.js';

const router = Router();

// Public — no requireAuth, since the very point of this route is that no
// account exists yet. `GET /status` is cheap/read-only and unlimited since
// the frontend polls it once per boot; `POST /initialize` reuses the same
// limiter as login/register since it's an account-creating endpoint.
router.get('/status', setupController.getStatus);
router.post('/initialize', authLimiter, validate(initializeSetupSchema), setupController.initialize);

export default router;
