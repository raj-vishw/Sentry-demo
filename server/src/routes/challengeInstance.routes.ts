import { Router } from 'express';
import * as challengeInstanceController from '../controllers/challengeInstance.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/:id', challengeInstanceController.get);
router.post('/:id/stop', challengeInstanceController.stop);
router.post('/:id/restart', challengeInstanceController.restart);

export default router;
