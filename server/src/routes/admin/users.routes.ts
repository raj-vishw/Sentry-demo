import { Router } from 'express';
import * as adminUserController from '../../controllers/adminUser.controller.js';
import { validate } from '../../middleware/validation.middleware.js';
import { listAdminUsersQuerySchema, exportUsersQuerySchema } from '../../validators/adminUser.schema.js';

const router = Router();

router.get('/', validate(listAdminUsersQuerySchema, 'query'), adminUserController.list);
// Must come before /:id — a dynamic segment would otherwise swallow
// "export.csv" as a literal (if nonsensical) user id lookup.
router.get('/export.csv', validate(exportUsersQuerySchema, 'query'), adminUserController.exportCsv);
router.get('/:id', adminUserController.getById);
router.post('/:id/disable', adminUserController.disable);
router.post('/:id/enable', adminUserController.enable);
router.post('/:id/ban', adminUserController.ban);
router.post('/:id/approve', adminUserController.approve);
router.post('/:id/reject', adminUserController.reject);
router.post('/:id/hide', adminUserController.hide);
router.post('/:id/unhide', adminUserController.unhide);

export default router;
