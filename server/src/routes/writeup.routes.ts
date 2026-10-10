import { Router } from 'express';
import * as writeupController from '../controllers/writeup.controller.js';
import { requireAuth, attachUserIfPresent } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import { createWriteupSchema, updateWriteupSchema, listWriteupsQuerySchema } from '../validators/writeup.schema.js';

const router = Router();

router.get('/', validate(listWriteupsQuerySchema, 'query'), writeupController.listPublished);
router.get('/mine', requireAuth, writeupController.listMine);
router.get('/:slug', attachUserIfPresent, writeupController.getBySlug);

router.post('/', requireAuth, validate(createWriteupSchema), writeupController.create);
router.patch('/:id', requireAuth, validate(updateWriteupSchema), writeupController.update);
router.post('/:id/submit', requireAuth, writeupController.submit);
router.delete('/:id', requireAuth, writeupController.remove);
router.post('/:id/like', requireAuth, writeupController.like);

export default router;
