import { Router } from 'express';
import * as competitionConfigController from '../../controllers/competitionConfig.controller.js';
import { validate } from '../../middleware/validation.middleware.js';
import { updateCompetitionConfigSchema } from '../../validators/competitionConfig.schema.js';

const router = Router();

router.get('/', competitionConfigController.getSettings);
router.patch('/', validate(updateCompetitionConfigSchema), competitionConfigController.updateSettings);

export default router;
