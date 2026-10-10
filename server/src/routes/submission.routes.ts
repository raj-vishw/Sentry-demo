import { Router } from 'express';
import * as submissionController from '../controllers/submission.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { submissionLimiter } from '../middleware/rateLimit.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { submitFlagSchema } from '../validators/submission.schema.js';

const router = Router();

router.post(
  '/:id/submit',
  requireAuth,
  submissionLimiter,
  validate(submitFlagSchema),
  submissionController.submit,
);

export default router;
