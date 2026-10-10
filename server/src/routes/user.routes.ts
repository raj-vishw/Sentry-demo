import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { updateProfileSchema } from '../validators/user.schema.js';

const router = Router();

router.get('/me', requireAuth, userController.getProfile);
router.patch('/me', requireAuth, validate(updateProfileSchema), userController.updateProfile);

// Public — registered after the static /me routes above since Express
// matches in registration order; a /:username route registered first
// would swallow /me as a literal username lookup instead of reaching the
// routes above.
router.get('/:username', userController.getPublicProfile);

export default router;
