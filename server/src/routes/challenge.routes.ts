import { Router } from 'express';
import * as challengeController from '../controllers/challenge.controller.js';
import * as challengeInstanceController from '../controllers/challengeInstance.controller.js';
import { requireAuth, attachUserIfPresent } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { listChallengesQuerySchema } from '../validators/challenge.schema.js';

const router = Router();

router.get('/', attachUserIfPresent, validate(listChallengesQuerySchema, 'query'), challengeController.list);
router.get('/:slug', attachUserIfPresent, challengeController.getBySlug);
router.get('/:id/files/:fileId/download', requireAuth, challengeController.downloadFile);
router.post('/:id/hints/:hintId/unlock', requireAuth, challengeController.unlockHint);
router.post('/:id/instances', requireAuth, challengeInstanceController.create);

export default router;
