import { Router } from 'express';
import * as reportController from '../controllers/report.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { createReportSchema } from '../validators/report.schema.js';

const router = Router();

router.post('/', requireAuth, validate(createReportSchema), reportController.create);

export default router;
