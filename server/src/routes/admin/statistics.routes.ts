import { Router } from 'express';
import * as statisticsController from '../../controllers/statistics.controller.js';
import { validate } from '../../middleware/validation.middleware.js';
import { statisticsRangeQuerySchema } from '../../validators/statistics.schema.js';

const router = Router();

router.get('/overview', statisticsController.overview);
router.get('/users', validate(statisticsRangeQuerySchema, 'query'), statisticsController.users);
router.get('/challenges', validate(statisticsRangeQuerySchema, 'query'), statisticsController.challenges);
router.get('/submissions', validate(statisticsRangeQuerySchema, 'query'), statisticsController.submissions);
router.get('/teams', validate(statisticsRangeQuerySchema, 'query'), statisticsController.teams);
router.get('/writeups', validate(statisticsRangeQuerySchema, 'query'), statisticsController.writeups);

export default router;
