import { Router } from 'express';
import * as systemConfigController from '../../controllers/systemConfig.controller.js';
import { validate } from '../../middleware/validation.middleware.js';
import { updateSystemConfigSchema } from '../../validators/systemConfig.schema.js';

const router = Router();

router.get('/', systemConfigController.getSettings);
router.patch('/', validate(updateSystemConfigSchema), systemConfigController.updateSettings);

export default router;
