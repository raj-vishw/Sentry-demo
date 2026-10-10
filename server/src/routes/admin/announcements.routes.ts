import { Router } from 'express';
import * as announcementController from '../../controllers/announcement.controller.js';
import { validate } from '../../middleware/validation.middleware.js';
import { createAnnouncementSchema } from '../../validators/announcement.schema.js';

const router = Router();

router.get('/', announcementController.listAdmin);
router.post('/', validate(createAnnouncementSchema), announcementController.create);
router.delete('/:id', announcementController.remove);

export default router;
