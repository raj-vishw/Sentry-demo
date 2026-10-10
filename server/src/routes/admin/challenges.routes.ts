import { Router } from 'express';
import * as challengeController from '../../controllers/challenge.controller.js';
import * as challengePackageController from '../../controllers/challengePackage.controller.js';
import { validate } from '../../middleware/validation.middleware.js';
import { createChallengeSchema, updateChallengeSchema } from '../../validators/challenge.schema.js';
import { importChallengeFormSchema } from '../../validators/challengePackage.schema.js';
import { upload } from '../../config/uploads.js';
import { packageUpload } from '../../config/packageUpload.js';

const router = Router();

// Literal "/import" ahead of the single-dynamic-segment "/:id" below —
// same "static before dynamic" rule as every other ambiguous route pair
// in this codebase (e.g. admin users' /export.csv before /:id).
router.post(
  '/import',
  packageUpload.single('archive'),
  validate(importChallengeFormSchema),
  challengePackageController.importChallenge,
);
router.get('/:id', challengeController.getByIdAdmin);
router.get('/:id/export', challengePackageController.exportChallenge);
router.post('/', validate(createChallengeSchema), challengeController.create);
router.patch('/:id', validate(updateChallengeSchema), challengeController.update);
router.delete('/:id', challengeController.remove);
router.post('/:id/publish', challengeController.publish);
router.post('/:id/unpublish', challengeController.unpublish);
router.post('/:id/archive', challengeController.archive);
router.post('/:id/restore', challengeController.restore);
router.post('/:id/files', upload.single('file'), challengeController.uploadFile);

export default router;
