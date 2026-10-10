import { Router } from 'express';
import * as pageController from '../../controllers/page.controller.js';
import { validate } from '../../middleware/validation.middleware.js';
import { createPageSchema, updatePageSchema } from '../../validators/page.schema.js';

const router = Router();

router.get('/', pageController.list);
router.post('/', validate(createPageSchema), pageController.create);
router.patch('/:id', validate(updatePageSchema), pageController.update);
router.delete('/:id', pageController.remove);

export default router;
