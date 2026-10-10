import { Router } from 'express';
import * as categoryController from '../../controllers/category.controller.js';
import { validate } from '../../middleware/validation.middleware.js';
import { updateCategorySchema } from '../../validators/category.schema.js';

const router = Router();

router.get('/', categoryController.list);
router.patch('/:slug', validate(updateCategorySchema), categoryController.update);

export default router;
