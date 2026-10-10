import { Router } from 'express';
import * as writeupController from '../../controllers/writeup.controller.js';
import { validate } from '../../middleware/validation.middleware.js';
import { listAdminWriteupsQuerySchema, rejectWriteupSchema } from '../../validators/writeup.schema.js';

const router = Router();

router.get('/', validate(listAdminWriteupsQuerySchema, 'query'), writeupController.listForAdmin);
router.get('/:id', writeupController.getByIdAdmin);
router.post('/:id/approve', writeupController.approve);
router.post('/:id/reject', validate(rejectWriteupSchema), writeupController.reject);
router.post('/:id/archive', writeupController.archive);

export default router;
