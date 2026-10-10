import { Router } from 'express';
import * as adminSubmissionController from '../../controllers/adminSubmission.controller.js';
import { validate } from '../../middleware/validation.middleware.js';
import { listAdminSubmissionsQuerySchema, exportSubmissionsQuerySchema } from '../../validators/adminSubmission.schema.js';

const router = Router();

router.get('/', validate(listAdminSubmissionsQuerySchema, 'query'), adminSubmissionController.list);
router.get('/export.csv', validate(exportSubmissionsQuerySchema, 'query'), adminSubmissionController.exportCsv);
router.post('/:id/invalidate', adminSubmissionController.invalidate);

export default router;
