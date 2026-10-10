import { Router } from 'express';
import * as reportController from '../../controllers/report.controller.js';
import { validate } from '../../middleware/validation.middleware.js';
import { listAdminReportsQuerySchema } from '../../validators/report.schema.js';

const router = Router();

router.get('/', validate(listAdminReportsQuerySchema, 'query'), reportController.list);
router.post('/:id/resolve', reportController.resolve);
router.post('/:id/dismiss', reportController.dismiss);

export default router;
